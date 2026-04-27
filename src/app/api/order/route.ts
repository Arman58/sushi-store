import { DeliveryType, PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

const rateLimitStore = new Map<string, number[]>();

type ClientPaymentMethod = "cash" | "card";
type ClientDeliveryType = "delivery" | "pickup";

type OrderItemPayload = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
};

type ValidatedOrderItem = {
    productId: number;
    name: string;
    price: number;
    quantity: number;
};

type OrderPayload = {
    name: string;
    phone: string;
    address: string;
    comment: string;
    payment: ClientPaymentMethod;
    delivery: ClientDeliveryType;
    items: OrderItemPayload[];
    totalPrice: number;
};

type ValidationResult =
    | { ok: true; value: OrderPayload }
    | { ok: false; message: string };

const DEFAULT_ERROR_MESSAGE = "Не удалось оформить заказ. Попробуйте ещё раз.";
const HONEYPOT_KEY = "hp";

function getClientIp(request: Request) {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
    return "unknown";
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const timestamps = rateLimitStore.get(ip)?.filter((ts) => ts > windowStart) ?? [];

    if (timestamps.length >= RATE_LIMIT_MAX) {
        rateLimitStore.set(ip, timestamps);
        return true;
    }

    timestamps.push(now);
    rateLimitStore.set(ip, timestamps);
    return false;
}

function validateOrderPayload(input: unknown): ValidationResult {
    if (!input || typeof input !== "object") {
        return { ok: false, message: "Неверный формат данных заказа" };
    }

    const body = input as Partial<OrderPayload>;

    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
        return { ok: false, message: "Укажите имя" };
    }

    if (typeof body.phone !== "string") {
        return {
            ok: false,
            message: "Введите корректный номер (например, XX XX XX XX)",
        };
    }

    const phoneDigitCount = (body.phone.match(/\d/g) ?? []).length;
    if (phoneDigitCount < 8) {
        return {
            ok: false,
            message: "Введите корректный номер (например, XX XX XX XX)",
        };
    }

    if (
        !body.delivery ||
        (body.delivery !== "delivery" && body.delivery !== "pickup")
    ) {
        return { ok: false, message: "Некорректный тип доставки" };
    }

    if (
        body.delivery === "delivery" &&
        (!body.address || typeof body.address !== "string" || body.address.trim().length < 5)
    ) {
        return { ok: false, message: "Укажите адрес доставки" };
    }

    if (!body.payment || (body.payment !== "cash" && body.payment !== "card")) {
        return { ok: false, message: "Некорректный способ оплаты" };
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
        return { ok: false, message: "Корзина пуста" };
    }

    const items: OrderItemPayload[] = [];

    for (const item of body.items as OrderItemPayload[]) {
        if (!item) {
            return { ok: false, message: "Некорректная позиция в заказе" };
        }

        const { productId, name, price, quantity } = item;

        if (typeof productId !== "number" || productId <= 0) {
            return { ok: false, message: "Некорректный товар в заказе" };
        }

        if (!name || typeof name !== "string") {
            return { ok: false, message: "Некорректное название товара" };
        }

        if (typeof price !== "number" || price <= 0) {
            return { ok: false, message: "Некорректная цена товара" };
        }

        if (typeof quantity !== "number" || quantity <= 0) {
            return { ok: false, message: "Некорректное количество товара" };
        }

        items.push({ productId, name, price, quantity });
    }

    if (typeof body.totalPrice !== "number" || body.totalPrice <= 0) {
        return { ok: false, message: "Некорректная сумма заказа" };
    }

    const recalculatedTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    if (Math.abs(recalculatedTotal - body.totalPrice) > 1) {
        return { ok: false, message: "Сумма заказа не совпадает с позициями" };
    }

    return {
        ok: true,
        value: {
            name: body.name.trim(),
            phone: body.phone.trim(),
            address:
                body.delivery === "delivery"
                    ? (body.address ?? "").toString().trim()
                    : "",
            comment: (body.comment ?? "").toString().trim(),
            payment: body.payment,
            delivery: body.delivery,
            items,
            totalPrice: body.totalPrice,
        },
    };
}

async function prepareOrderItems(
    items: OrderItemPayload[],
):
    Promise<
        | { ok: true; items: ValidatedOrderItem[]; total: number }
        | { ok: false; message: string }
    > {
    const uniqueIds = Array.from(new Set(items.map((item) => item.productId)));

    const products = await prisma.product.findMany({
        where: { id: { in: uniqueIds }, isActive: true },
        select: { id: true, name: true, price: true },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const validatedItems: ValidatedOrderItem[] = [];

    for (const item of items) {
        const product = productMap.get(item.productId);

        if (!product) {
            return {
                ok: false,
                message: `Товар недоступен: ${item.name}`,
            };
        }

        validatedItems.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
        });
    }

    const total = validatedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    return { ok: true, items: validatedItems, total };
}

export async function POST(request: Request) {
    const clientIp = getClientIp(request);

    if (isRateLimited(clientIp)) {
        return NextResponse.json(
            { error: "Слишком много запросов. Попробуйте позже." },
            { status: 429 },
        );
    }

    let json: unknown;

    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (json && typeof json === "object" && HONEYPOT_KEY in (json as Record<string, unknown>)) {
        const honeypotValue = (json as Record<string, unknown>)[HONEYPOT_KEY];
        if (typeof honeypotValue === "string" && honeypotValue.trim().length > 0) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }
    }

    const validation = validateOrderPayload(json);

    if (!validation.ok) {
        return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const { name, phone, address, comment, payment, delivery, items, totalPrice } =
        validation.value;

    // Сверяем позиции с БД, чтобы исключить манипуляцию ценой и убрать неактивные товары
    const verifiedItemsResult = await prepareOrderItems(items);

    if (!verifiedItemsResult.ok) {
        return NextResponse.json(
            { error: verifiedItemsResult.message },
            { status: 409 },
        );
    }

    const verifiedItems = verifiedItemsResult.items;
    const verifiedTotal = verifiedItemsResult.total;

    if (verifiedTotal !== totalPrice) {
        return NextResponse.json(
            {
                error:
                    "Цены на некоторые позиции обновились. Соберите заказ заново, чтобы увидеть актуальную сумму.",
            },
            { status: 409 },
        );
    }

    // 1) Сначала сохраняем заказ в БД
    let createdOrderId: number;
    try {
        const created = await prisma.order.create({
            data: {
                name,
                phone,
                address: address || null,
                comment: comment || null,
                payment:
                    payment === "cash" ? PaymentMethod.CASH : PaymentMethod.CARD,
                delivery:
                    delivery === "delivery"
                        ? DeliveryType.DELIVERY
                        : DeliveryType.PICKUP,
                status: "NEW",
                totalPrice: verifiedTotal,
                items: {
                    create: verifiedItems.map((item) => ({
                        productId: item.productId,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                    })),
                },
            },
            select: { id: true },
        });
        createdOrderId = created.id;
    } catch (error) {
        console.error("Prisma order create error:", error);
        return NextResponse.json(
            { error: DEFAULT_ERROR_MESSAGE },
            { status: 500 },
        );
    }

    // 2) Только после успешного создания — уведомление в Telegram (сбой не ломает ответ клиенту)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const lines: string[] = [];

        lines.push("🍣 *Новый заказ East West*");
        lines.push(`📋 Заказ №${createdOrderId}`);
        lines.push("");
        lines.push(`👤 Имя: *${name}*`);
        lines.push(`📞 Телефон: \`${phone}\``);

        if (delivery === "delivery") {
            lines.push(`📍 Доставка: *${address || "адрес не указан"}*`);
        } else {
            lines.push("📍 Самовывоз");
        }

        lines.push(`💳 Оплата: *${payment === "cash" ? "Наличными" : "Картой"}*`);

        if (comment) {
            lines.push("");
            lines.push(`💬 Комментарий: _${comment}_`);
        }

        lines.push("");
        lines.push("🧾 Позиции:");

        for (const item of verifiedItems) {
            lines.push(
                `• ${item.name} × ${item.quantity} — *${(
                    item.price * item.quantity
                ).toLocaleString("ru-RU")} ֏*`,
            );
        }

        lines.push("");
        lines.push(`💰 *Итого: ${verifiedTotal.toLocaleString("ru-RU")} ֏*`);

        const text = lines.join("\n");
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

        try {
            const telegramResponse = await fetch(telegramUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text,
                    parse_mode: "Markdown",
                }),
            });

            if (!telegramResponse.ok) {
                const errorText = await telegramResponse.text().catch(() => "");
                console.error("Telegram error:", telegramResponse.status, errorText);
            }
        } catch (error) {
            console.error("Telegram request failed:", error);
        }
    } else {
        console.error("Telegram env is not configured");
    }

    return NextResponse.json(
        { ok: true, orderId: createdOrderId },
        { status: 201 },
    );
}

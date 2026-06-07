import { DeliveryType, PaymentMethod, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { escapeHtml } from "@/lib/escape-html";
import {
    NOTIFICATION_FETCH_TIMEOUT_MS,
    fetchWithTimeout,
} from "@/lib/fetch-with-timeout";
import { prepareOrderItems, type VerifiedOrderItem } from "@/lib/prepare-order-items";
import { prisma } from "@/lib/prisma";
import {
    computePromoDiscountAmount,
    getPromoRejectionReason,
} from "@/lib/promo";
import {
    buildKitchenStatusKeyboard,
    isKitchenTelegramConfigured,
} from "@/lib/telegram-kitchen";

import {
    countPhoneDigits,
    firstZodMessage,
    type OrderPayload,
    orderPayloadSchema,
} from "./_schema";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const telegramNotifyEnabled = isKitchenTelegramConfigured();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

const rateLimitStore = new Map<string, number[]>();

const DEFAULT_ERROR_MESSAGE = "Не удалось оформить заказ. Попробуйте ещё раз.";

// ─── Rate limit ────────────────────────────────────────────────────────────────

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
    const timestamps =
        rateLimitStore.get(ip)?.filter((ts) => ts > windowStart) ?? [];

    if (timestamps.length >= RATE_LIMIT_MAX) {
        rateLimitStore.set(ip, timestamps);
        return true;
    }

    timestamps.push(now);
    rateLimitStore.set(ip, timestamps);
    return false;
}

type KitchenTelegramPayload = {
    orderId: number;
    name: string;
    phone: string;
    address: string | undefined;
    comment: string | undefined;
    payment: OrderPayload["payment"];
    delivery: OrderPayload["delivery"];
    verifiedItems: VerifiedOrderItem[];
    deliveryFee: number;
    zoneNameSnapshot: string | null;
    promoCodeRaw: string | undefined;
    payableForNotify: number;
    grandBeforePay: number;
};

async function notifyKitchenTelegram(payload: KitchenTelegramPayload): Promise<void> {
    if (!telegramNotifyEnabled || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    const {
        orderId,
        name,
        phone,
        address,
        comment,
        payment,
        delivery,
        verifiedItems,
        deliveryFee,
        zoneNameSnapshot,
        promoCodeRaw,
        payableForNotify,
        grandBeforePay,
    } = payload;

    const lines: string[] = [];

    lines.push("<b>🍣 Новый заказ East West</b>");
    lines.push(`<b>📋 Заказ №${orderId}</b>`);
    lines.push("");
    lines.push(`<b>👤 Имя:</b> ${escapeHtml(name)}`);
    lines.push(`<b>📞 Телефон:</b> <code>${escapeHtml(phone)}</code>`);

    if (delivery === "delivery") {
        lines.push(
            `<b>📍 Доставка:</b> ${escapeHtml(address || "адрес не указан")}`,
        );
    } else {
        lines.push("<b>📍</b> <i>Самовывоз</i>");
    }

    lines.push(
        `<b>💳 Оплата:</b> ${payment === "cash" ? "<i>Наличными</i>" : "<i>Картой</i>"}`,
    );

    if (comment) {
        lines.push("");
        lines.push(`<b>💬 Комментарий:</b> <i>${escapeHtml(comment)}</i>`);
    }

    lines.push("");
    lines.push("<b>🧾 Позиции:</b>");

    for (const item of verifiedItems) {
        const modsRaw = item.selectedModifiers;
        let modSuffix = "";
        if (Array.isArray(modsRaw) && modsRaw.length > 0) {
            const labels = modsRaw
                .map((m: unknown) =>
                    m &&
                    typeof m === "object" &&
                    "name" in m &&
                    typeof (m as { name: string }).name === "string"
                        ? escapeHtml((m as { name: string }).name)
                        : null,
                )
                .filter(Boolean);
            if (labels.length > 0) {
                modSuffix = ` <i>(${labels.join(", ")})</i>`;
            }
        }
        lines.push(
            `• ${escapeHtml(item.name)}${modSuffix} × ${item.quantity} - <b>${(
                item.price * item.quantity
            ).toLocaleString("ru-RU")} ֏</b>`,
        );
    }

    if (delivery === "delivery" && deliveryFee > 0 && zoneNameSnapshot) {
        lines.push("");
        lines.push(
            `<b>🚚 Доставка (${escapeHtml(zoneNameSnapshot)}):</b> <b>${deliveryFee.toLocaleString("ru-RU")} ֏</b>`,
        );
    }

    if (promoCodeRaw && payableForNotify < grandBeforePay) {
        const disc = grandBeforePay - payableForNotify;
        lines.push("");
        lines.push(
            `<b>🏷️ Промокод</b> <code>${escapeHtml(promoCodeRaw)}</code>: <b>−${disc.toLocaleString("ru-RU")} ֏</b>`,
        );
    }

    lines.push("");
    lines.push(`<b>💰 Итого: ${payableForNotify.toLocaleString("ru-RU")} ֏</b>`);

    const text = lines.join("\n");
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const telegramResponse = await fetchWithTimeout(
        telegramUrl,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: "HTML",
                reply_markup: buildKitchenStatusKeyboard(orderId),
            }),
        },
        NOTIFICATION_FETCH_TIMEOUT_MS,
    );

    if (!telegramResponse.ok) {
        const errorText = await telegramResponse.text().catch(() => "");
        console.error("Telegram error:", telegramResponse.status, errorText);
    }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const clientIp = getClientIp(request);

    if (isRateLimited(clientIp)) {
        return NextResponse.json(
            { error: "Слишком много запросов. Попробуйте позже." },
            { status: 429 },
        );
    }

    // Авторизованный — привяжем к userId. Гостевые остаются гостевыми.
    const session = await auth();
    const sessionUserIdRaw =
        session?.user?.id != null && Number.isFinite(session.user.id)
            ? Number(session.user.id)
            : null;

    /** Привязываем только к существующему User (Int), иначе null — без FK-ошибки. */
    const sessionUserId =
        sessionUserIdRaw != null
            ? (
                  await prisma.user.findUnique({
                      where: { id: sessionUserIdRaw },
                      select: { id: true },
                  })
              )?.id ?? null
            : null;

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── Zod-валидация формата ────────────────────────────────────────────────
    const parsed = orderPayloadSchema.safeParse(json);

    if (!parsed.success) {
        return NextResponse.json(
            { error: firstZodMessage(parsed.error) },
            { status: 400 },
        );
    }

    const payload: OrderPayload = parsed.data;
    const {
        name,
        phone,
        address,
        comment,
        payment,
        delivery,
        items,
        totalPrice,
        subtotalBeforeDiscount: declaredSubtotal,
        discountAmount: declaredDiscount,
        deliveryZoneId,
        promoCode: promoCodeRaw,
    } = payload;

    // ── Сверка позиций с БД (пересчёт цен, snapshot, правила групп) ──────────
    const declaredItemsTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    const verifiedItemsResult = await prepareOrderItems(items);

    if (!verifiedItemsResult.ok) {
        return NextResponse.json(
            { error: verifiedItemsResult.message },
            { status: verifiedItemsResult.httpStatus },
        );
    }

    const verifiedItems = verifiedItemsResult.items;
    const verifiedTotal = verifiedItemsResult.total;

    if (verifiedTotal !== declaredItemsTotal) {
        return NextResponse.json(
            {
                error:
                    "Цены на некоторые позиции обновились. Соберите заказ заново, чтобы увидеть актуальную сумму.",
            },
            { status: 409 },
        );
    }

    // ── Зона доставки ────────────────────────────────────────────────────────
    let deliveryFee = 0;
    let zoneIdForDb: number | null = null;
    let zoneNameSnapshot: string | null = null;

    if (delivery === "delivery") {
        const zoneId = deliveryZoneId;
        if (!zoneId) {
            return NextResponse.json(
                { error: "Выберите зону доставки" },
                { status: 400 },
            );
        }

        const zone = await prisma.deliveryZone.findFirst({
            where: { id: zoneId, isActive: true },
        });

        if (!zone) {
            return NextResponse.json(
                { error: "Выбранная зона доставки недоступна" },
                { status: 400 },
            );
        }

        if (verifiedTotal < zone.minOrderAmount) {
            return NextResponse.json(
                {
                    error: `Минимальная сумма заказа для выбранной зоны - ${zone.minOrderAmount.toLocaleString("ru-RU")} ֏`,
                },
                { status: 400 },
            );
        }

        deliveryFee = zone.deliveryPrice;
        zoneIdForDb = zone.id;
        zoneNameSnapshot = zone.name;
    }

    const grandBeforePay = verifiedTotal + deliveryFee;

    let discountAmt = 0;
    let promoDbId: number | null = null;

    if (promoCodeRaw) {
        const promoRow = await prisma.promoCode.findUnique({
            where: { code: promoCodeRaw },
        });
        const reason = getPromoRejectionReason(promoRow, {
            cartSubtotal: verifiedTotal,
            grandTotalBeforeDiscount: grandBeforePay,
        });
        if (reason) {
            return NextResponse.json({ error: reason }, { status: 422 });
        }
        discountAmt = computePromoDiscountAmount(
            promoRow!,
            verifiedTotal,
            grandBeforePay,
        );
        promoDbId = promoRow!.id;
    }

    const payableTotal = verifiedTotal - discountAmt + deliveryFee;

    if (declaredSubtotal !== undefined && declaredSubtotal !== verifiedTotal) {
        return NextResponse.json(
            {
                error:
                    "Сумма товаров не совпадает с расчётом сервера. Обновите страницу.",
            },
            { status: 409 },
        );
    }
    if (declaredDiscount !== undefined && declaredDiscount !== discountAmt) {
        return NextResponse.json(
            {
                error:
                    "Сумма скидки не совпадает с расчётом сервера. Обновите страницу.",
            },
            { status: 409 },
        );
    }

    // ── Транзакция: инкремент промокода и создание заказа ─────────────────────
    let createdOrderId!: number;
    let createdAccessToken!: string;
    let payableForNotify = payableTotal;

    try {
        await prisma.$transaction(async (tx) => {
            if (promoCodeRaw && promoDbId != null) {
                const bumped = await tx.$queryRaw<Array<{ id: number }>>(
                    Prisma.sql`
                        UPDATE "PromoCode"
                        SET "timesUsed" = "timesUsed" + 1
                        WHERE "id" = ${promoDbId}
                          AND "isActive" = true
                          AND ("maxUsages" IS NULL OR "timesUsed" < "maxUsages")
                        RETURNING "id"
                    `,
                );

                if (bumped.length === 0) {
                    throw Object.assign(
                        new Error("Промокод больше нельзя применить"),
                        { httpStatus: 409 },
                    );
                }
            }

            if (payableTotal !== totalPrice) {
                throw Object.assign(
                    new Error(
                        "Сумма заказа не совпадает с расчётом позиций, доставки и скидки. Обновите страницу и попробуйте снова.",
                    ),
                    { httpStatus: 409 },
                );
            }

            const phoneForDb =
                countPhoneDigits(phone) >= 8
                    ? phone
                    : delivery === "pickup"
                      ? "—"
                      : phone;

            const created = await tx.order.create({
                data: {
                    name,
                    phone: phoneForDb,
                    address: address || null,
                    comment: comment || null,
                    payment:
                        payment === "cash" ? PaymentMethod.CASH : PaymentMethod.CARD,
                    delivery:
                        delivery === "delivery"
                            ? DeliveryType.DELIVERY
                            : DeliveryType.PICKUP,
                    status: "NEW",
                    subtotalBeforeDiscount: verifiedTotal,
                    discountAmount: discountAmt,
                    totalPrice: payableTotal,
                    deliveryZoneId: zoneIdForDb,
                    deliveryZoneName: zoneNameSnapshot,
                    deliveryPrice: deliveryFee,
                    promoCodeId: promoDbId,
                    userId: sessionUserId,
                    items: {
                        create: verifiedItems.map((item) => ({
                            productId: item.productId,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            selectedModifiers: item.selectedModifiers,
                        })),
                    },
                },
                select: { id: true, accessToken: true },
            });
            createdOrderId = created.id;
            createdAccessToken = created.accessToken;
            payableForNotify = payableTotal;
        });
    } catch (error: unknown) {
        const msg =
            error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;
        const httpStatus =
            typeof error === "object" &&
            error !== null &&
            "httpStatus" in error &&
            typeof (error as { httpStatus?: unknown }).httpStatus === "number"
                ? (error as { httpStatus: number }).httpStatus
                : 500;
        if (httpStatus >= 400 && httpStatus < 500) {
            return NextResponse.json({ error: msg }, { status: httpStatus });
        }
        console.error("Prisma order create error:", error);
        return NextResponse.json(
            { error: DEFAULT_ERROR_MESSAGE },
            { status: 500 },
        );
    }

    // ── Telegram-уведомление (не блокирует ответ 201) ────────────────────────
    if (telegramNotifyEnabled) {
        void notifyKitchenTelegram({
            orderId: createdOrderId,
            name,
            phone,
            address: address ?? undefined,
            comment: comment ?? undefined,
            payment,
            delivery,
            verifiedItems,
            deliveryFee,
            zoneNameSnapshot,
            promoCodeRaw: promoCodeRaw ?? undefined,
            payableForNotify,
            grandBeforePay,
        }).catch((error) => {
            console.error("Telegram request failed:", error);
        });
    }

    return NextResponse.json(
        {
            ok: true,
            order: { id: createdOrderId, accessToken: createdAccessToken },
        },
        { status: 201 },
    );
}

import { DeliveryType, PaymentMethod, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
    getInvalidCartPayloadMessage,
    localizedApiErrorJsonResponse,
    resolveOrderRequestLocale,
} from "@/lib/backend-i18n";
import { escapeHtml } from "@/lib/escape-html";
import {
    fetchWithTimeout,
    NOTIFICATION_FETCH_TIMEOUT_MS,
} from "@/lib/fetch-with-timeout";
import { getLocalizedField } from "@/lib/i18n-utils";
import {
    ORDER_ACCESS_COOKIE_MAX_AGE_SEC,
    orderAccessCookieName,
} from "@/lib/order-access";
import { prepareOrderItems, type VerifiedOrderItem } from "@/lib/prepare-order-items";
import { prisma } from "@/lib/prisma";
import {
    computePromoDiscountAmount,
    getPromoRejectionReason,
} from "@/lib/promo";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";
import { API_ERROR_CODES, type ApiErrorCode } from "@/shared/lib/api-error";
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

const DEFAULT_ERROR_MESSAGE = "Не удалось оформить заказ. Попробуйте ещё раз.";

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
        // Telegram notification failed; order still proceeds
        void telegramResponse.text().catch(() => "");
    }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "order");
    if (!rateLimit.allowed) {
        return rateLimitExceededJsonResponse();
    }

    // Авторизованный - привяжем к userId. Гостевые остаются гостевыми.
    const session = await auth();
    const sessionUserIdRaw =
        session?.user?.id != null && Number.isFinite(session.user.id)
            ? Number(session.user.id)
            : null;

    /** Привязываем только к существующему User (Int), иначе null - без FK-ошибки. */
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
        locale: payloadLocale,
    } = payload;

    const locale = resolveOrderRequestLocale(request, payloadLocale);

    // ── Сверка позиций с БД (пересчёт цен, snapshot, правила групп) ──────────
    const declaredItemsTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    const verifiedItemsResult = await prepareOrderItems(items, locale);

    if (!verifiedItemsResult.ok) {
        if (
            verifiedItemsResult.code === API_ERROR_CODES.INVALID_CART_PAYLOAD &&
            verifiedItemsResult.invalidReason
        ) {
            return NextResponse.json(
                {
                    error: getInvalidCartPayloadMessage(
                        verifiedItemsResult.invalidReason,
                        locale,
                    ),
                    code: verifiedItemsResult.code,
                },
                { status: verifiedItemsResult.httpStatus },
            );
        }
        return localizedApiErrorJsonResponse(
            verifiedItemsResult.code,
            locale,
            verifiedItemsResult.httpStatus,
            verifiedItemsResult.params,
        );
    }

    const verifiedItems = verifiedItemsResult.items;
    const verifiedTotal = verifiedItemsResult.total;

    if (verifiedTotal !== declaredItemsTotal) {
        return localizedApiErrorJsonResponse(
            API_ERROR_CODES.PRICE_MISMATCH,
            locale,
            409,
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
        zoneNameSnapshot = getLocalizedField(zone.name, locale);
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
        return localizedApiErrorJsonResponse(
            API_ERROR_CODES.SUBTOTAL_MISMATCH,
            locale,
            409,
        );
    }
    if (declaredDiscount !== undefined && declaredDiscount !== discountAmt) {
        return localizedApiErrorJsonResponse(
            API_ERROR_CODES.DISCOUNT_MISMATCH,
            locale,
            409,
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
                    throw Object.assign(new Error(API_ERROR_CODES.PROMO_UNAVAILABLE), {
                        httpStatus: 409,
                        code: API_ERROR_CODES.PROMO_UNAVAILABLE,
                    });
                }
            }

            if (payableTotal !== totalPrice) {
                throw Object.assign(new Error(API_ERROR_CODES.TOTAL_MISMATCH), {
                    httpStatus: 409,
                    code: API_ERROR_CODES.TOTAL_MISMATCH,
                });
            }

            const phoneForDb =
                countPhoneDigits(phone) >= 8
                    ? phone
                    : delivery === "pickup"
                      ? "-"
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
        const code =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            typeof (error as { code?: unknown }).code === "string"
                ? (error as { code: string }).code
                : undefined;
        if (httpStatus >= 400 && httpStatus < 500) {
            if (
                code &&
                Object.values(API_ERROR_CODES).includes(code as ApiErrorCode)
            ) {
                return localizedApiErrorJsonResponse(
                    code as ApiErrorCode,
                    locale,
                    httpStatus,
                );
            }
            return NextResponse.json({ error: msg }, { status: httpStatus });
        }
        // Error logged in production monitoring
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
        }).catch(() => {
            // Telegram notification failed; order still created
        });
    }

    const response = NextResponse.json(
        {
            ok: true,
            order: { id: createdOrderId, accessToken: createdAccessToken },
        },
        { status: 201 },
    );

    // HttpOnly cookie: гость видит трекер без ?key= в URL (см. order-access.ts).
    response.cookies.set({
        name: orderAccessCookieName(createdOrderId),
        value: createdAccessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ORDER_ACCESS_COOKIE_MAX_AGE_SEC,
        path: "/",
    });

    return response;
}

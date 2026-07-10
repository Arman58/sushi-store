import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
    getFormValidationMessage,
    getInvalidCartPayloadMessage,
    getPromoRejectionMessage,
    localizedApiErrorJsonResponse,
    resolveOrderRequestLocale,
} from "@/lib/backend-i18n";
import {
    ORDER_ACCESS_COOKIE_MAX_AGE_SEC,
    orderAccessCookieName,
} from "@/lib/order-access";
import { prisma } from "@/lib/prisma";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";
import { notifyKitchenTelegram } from "@/lib/telegram-kitchen-notify";
import { getUpstashRedis } from "@/lib/upstash-redis";
import { createOrder, OrderServiceError } from "@/server/services/order.service";
import { type ApiErrorCode } from "@/shared/lib/api-error";

/**
 * Идемпотентность создания заказа (защита от дублей при double-tap /
 * ретраях сети). Клиент шлёт заголовок Idempotency-Key (uuid на попытку
 * оформления). Без Redis - best-effort no-op.
 */
const IDEM_PREFIX = "order:idem:";
const IDEM_PENDING_TTL_SEC = 300;
const IDEM_RESULT_TTL_SEC = 24 * 60 * 60;

type IdempotencyStored = { id: number; accessToken: string };

function parseStoredIdempotency(value: unknown): IdempotencyStored | null {
    const obj =
        typeof value === "string"
            ? (() => {
                  try {
                      return JSON.parse(value) as unknown;
                  } catch {
                      return null;
                  }
              })()
            : value;
    if (
        obj != null &&
        typeof obj === "object" &&
        typeof (obj as IdempotencyStored).id === "number" &&
        typeof (obj as IdempotencyStored).accessToken === "string"
    ) {
        return obj as IdempotencyStored;
    }
    return null;
}

import {
    firstZodMessage,
    type OrderPayload,
    orderPayloadSchema,
} from "./_schema";

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "order");
    if (!rateLimit.allowed) {
        return rateLimitExceededJsonResponse();
    }

    const session = await auth();
    const sessionUserIdRaw =
        session?.user?.id != null && Number.isFinite(session.user.id)
            ? Number(session.user.id)
            : null;

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

    const parsed = orderPayloadSchema.safeParse(json);

    if (!parsed.success) {
        const rawLocale =
            json && typeof json === "object" && "locale" in json
                ? (json as { locale?: unknown }).locale
                : undefined;
        const locale = resolveOrderRequestLocale(
            request,
            typeof rawLocale === "string" ? rawLocale : null,
        );
        return NextResponse.json(
            {
                error: getFormValidationMessage(
                    firstZodMessage(parsed.error),
                    locale,
                ),
            },
            { status: 400 },
        );
    }

    const payload: OrderPayload = parsed.data;
    const locale = resolveOrderRequestLocale(request, payload.locale);

    const redis = getUpstashRedis();
    const idemHeader = request.headers.get("idempotency-key")?.trim() ?? "";
    const idemKey =
        redis && idemHeader && idemHeader.length <= 128
            ? `${IDEM_PREFIX}${idemHeader}`
            : null;

    if (idemKey && redis) {
        try {
            const acquired = await redis.set(idemKey, "pending", {
                nx: true,
                ex: IDEM_PENDING_TTL_SEC,
            });
            if (acquired === null) {
                const existing = await redis.get(idemKey);
                const stored = parseStoredIdempotency(existing);
                if (stored) {
                    // Дубликат уже созданного заказа - возвращаем его же.
                    return NextResponse.json(
                        { ok: true, order: stored, duplicate: true },
                        { status: 200 },
                    );
                }
                // Первый запрос ещё в полёте.
                return NextResponse.json(
                    { error: "Duplicate request" },
                    { status: 409 },
                );
            }
        } catch {
            // Redis недоступен - идемпотентность best-effort, заказ важнее.
        }
    }

    try {
        const result = await createOrder(payload, sessionUserId, locale);

        if (idemKey && redis) {
            void redis
                .set(
                    idemKey,
                    JSON.stringify({
                        id: result.createdOrderId,
                        accessToken: result.createdAccessToken,
                    }),
                    { ex: IDEM_RESULT_TTL_SEC },
                )
                .catch(() => {});
        }

        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            void notifyKitchenTelegram({
                orderId: result.createdOrderId,
                name: payload.name,
                phone: payload.phone,
                address: payload.address ?? undefined,
                comment: payload.comment ?? undefined,
                payment: payload.payment,
                changeFrom: payload.payment === "cash" && payload.changeFrom != null ? payload.changeFrom : null,
                scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : null,
                delivery: payload.delivery,
                verifiedItems: result.verifiedItems,
                deliveryFee: result.deliveryFee,
                zoneNameSnapshot: result.zoneNameSnapshot,
                promoCodeRaw: payload.promoCode ?? undefined,
                payableForNotify: result.payableForNotify,
                grandBeforePay: result.grandBeforePay,
            }).catch(() => {});
        }

        const response = NextResponse.json(
            {
                ok: true,
                order: { id: result.createdOrderId, accessToken: result.createdAccessToken },
            },
            { status: 201 },
        );

        response.cookies.set({
            name: orderAccessCookieName(result.createdOrderId),
            value: result.createdAccessToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: ORDER_ACCESS_COOKIE_MAX_AGE_SEC,
            path: "/",
        });

        return response;
    } catch (error: unknown) {
        // Заказ не создан - освобождаем pending, чтобы ретрай с тем же
        // ключом не упирался в 409 до истечения TTL.
        if (idemKey && redis) {
            void redis.del(idemKey).catch(() => {});
        }
        if (error instanceof OrderServiceError) {
            if (error.code === "INVALID_CART_PAYLOAD") {
                if (error.invalidReason?.startsWith("promo.")) {
                    const reason = getPromoRejectionMessage(
                        error.invalidReason.replace("promo.", ""),
                        locale,
                        error.params
                    );
                    return NextResponse.json({ error: reason }, { status: error.httpStatus });
                }
                if (error.invalidReason?.startsWith("form.")) {
                    return NextResponse.json({ error: getFormValidationMessage(error.invalidReason, locale, error.params) }, { status: error.httpStatus });
                }
                return NextResponse.json(
                    {
                        error: getInvalidCartPayloadMessage((error.invalidReason || "unknown") as Parameters<typeof getInvalidCartPayloadMessage>[0], locale),
                        code: error.code,
                    },
                    { status: error.httpStatus },
                );
            }
            if (error.code === "PROMO_UNAVAILABLE" || error.code === "TOTAL_MISMATCH") {
                const fallbackError = getFormValidationMessage("form.invalidPayload", locale);
                return NextResponse.json({ error: fallbackError }, { status: error.httpStatus });
            }
            return localizedApiErrorJsonResponse(
                error.code as ApiErrorCode,
                locale,
                error.httpStatus,
                error.params
            );
        }

        const fallbackError = getFormValidationMessage("form.invalidPayload", locale);
        const msg = error instanceof Error ? error.message : fallbackError;
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

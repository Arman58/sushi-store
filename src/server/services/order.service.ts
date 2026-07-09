import { DeliveryType, PaymentMethod, Prisma } from "@prisma/client";

import type { OrderPayload } from "@/app/api/order/_schema";
import { countPhoneDigits } from "@/app/api/order/_schema";
import { getLocalizedField } from "@/lib/i18n-utils";
import { prepareOrderItems, type VerifiedOrderItem } from "@/lib/prepare-order-items";
import { prisma } from "@/lib/prisma";
import {
    computePromoDiscountAmount,
    getPromoRejectionCode,
} from "@/lib/promo";
import { isStoreOpen, isValidScheduleSlot } from "@/lib/site-config";
import { API_ERROR_CODES, type ApiErrorCode } from "@/shared/lib/api-error";

export type OrderServiceResult = {
    createdOrderId: number;
    createdAccessToken: string;
    verifiedItems: VerifiedOrderItem[];
    deliveryFee: number;
    zoneNameSnapshot: string | null;
    payableForNotify: number;
    grandBeforePay: number;
};

export class OrderServiceError extends Error {
    constructor(
        public readonly code: ApiErrorCode | "INVALID_CART_PAYLOAD" | "PROMO_UNAVAILABLE" | "TOTAL_MISMATCH",
        public readonly httpStatus: number,
        public readonly params?: Record<string, string | number>,
        public readonly invalidReason?: string,
    ) {
        super(code);
    }
}

export async function createOrder(
    payload: OrderPayload,
    sessionUserId: number | null,
    locale: string
): Promise<OrderServiceResult> {
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
        changeFrom: changeFromRaw,
    } = payload;

    const scheduledFor = payload.scheduledFor ? new Date(payload.scheduledFor) : null;
    
    if (scheduledFor && !isValidScheduleSlot(scheduledFor)) {
        throw new OrderServiceError(API_ERROR_CODES.SCHEDULE_INVALID, 400);
    }

    if (!isStoreOpen() && !scheduledFor) {
        throw new OrderServiceError(API_ERROR_CODES.STORE_CLOSED, 409);
    }

    const changeFrom = payment === "cash" && changeFromRaw != null ? changeFromRaw : null;

    const declaredItemsTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );

    const verifiedItemsResult = await prepareOrderItems(items, locale);

    if (!verifiedItemsResult.ok) {
        throw new OrderServiceError(
            verifiedItemsResult.code,
            verifiedItemsResult.httpStatus,
            verifiedItemsResult.params,
            verifiedItemsResult.code === API_ERROR_CODES.INVALID_CART_PAYLOAD ? verifiedItemsResult.invalidReason : undefined
        );
    }

    const verifiedItems = verifiedItemsResult.items;
    const verifiedTotal = verifiedItemsResult.total;

    if (verifiedTotal !== declaredItemsTotal) {
        throw new OrderServiceError(API_ERROR_CODES.PRICE_MISMATCH, 409);
    }

    let deliveryFee = 0;
    let zoneIdForDb: number | null = null;
    let zoneNameSnapshot: string | null = null;

    if (delivery === "delivery") {
        const zoneId = deliveryZoneId;
        if (!zoneId) {
            throw new OrderServiceError(API_ERROR_CODES.INVALID_CART_PAYLOAD, 400, undefined, "form.zone.selectRequired");
        }

        const zone = await prisma.deliveryZone.findFirst({
            where: { id: zoneId, isActive: true },
            include: { translations: true },
        });

        if (!zone) {
            throw new OrderServiceError(API_ERROR_CODES.INVALID_CART_PAYLOAD, 400, undefined, "form.zone.unavailable");
        }

        if (verifiedTotal < zone.minOrderAmount) {
            throw new OrderServiceError(API_ERROR_CODES.INVALID_CART_PAYLOAD, 400, { amount: String(zone.minOrderAmount) }, "form.zone.belowMin");
        }

        deliveryFee = zone.deliveryPrice;
        zoneIdForDb = zone.id;
        zoneNameSnapshot = getLocalizedField(zone.translations, locale, "name");
    }

    const grandBeforePay = verifiedTotal + deliveryFee;

    let discountAmt = 0;
    let promoDbId: number | null = null;

    if (promoCodeRaw) {
        const promoRow = await prisma.promoCode.findUnique({
            where: { code: promoCodeRaw },
        });
        const rejection = getPromoRejectionCode(promoRow, {
            cartSubtotal: verifiedTotal,
            grandTotalBeforeDiscount: grandBeforePay,
            deliveryAmount: deliveryFee,
            items: verifiedItems,
        });
        if (rejection) {
            if (rejection.code === "belowMin") {
                throw new OrderServiceError(API_ERROR_CODES.INVALID_CART_PAYLOAD, 422, { amount: String(rejection.minOrderAmount) }, `promo.${rejection.code}`);
            }
            throw new OrderServiceError(API_ERROR_CODES.INVALID_CART_PAYLOAD, 422, undefined, `promo.${rejection.code}`);
        }
        discountAmt = computePromoDiscountAmount(
            promoRow!,
            verifiedTotal,
            grandBeforePay,
            deliveryFee,
            verifiedItems
        );
        promoDbId = promoRow!.id;
    }

    const payableTotal = verifiedTotal - discountAmt + deliveryFee;

    if (changeFrom != null && changeFrom < payableTotal) {
        throw new OrderServiceError(API_ERROR_CODES.CHANGE_FROM_TOO_SMALL, 400);
    }

    if (declaredSubtotal !== undefined && declaredSubtotal !== verifiedTotal) {
        throw new OrderServiceError(API_ERROR_CODES.SUBTOTAL_MISMATCH, 409);
    }
    if (declaredDiscount !== undefined && declaredDiscount !== discountAmt) {
        throw new OrderServiceError(API_ERROR_CODES.DISCOUNT_MISMATCH, 409);
    }

    let createdOrderId!: number;
    let createdAccessToken!: string;
    const payableForNotify = payableTotal;

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
                throw new OrderServiceError("PROMO_UNAVAILABLE", 409);
            }
        }

        if (payableTotal !== totalPrice) {
            throw new OrderServiceError("TOTAL_MISMATCH", 409);
        }

        const phoneForDb =
            countPhoneDigits(phone) >= 8
                ? phone
                : delivery === "pickup"
                  ? "-"
                  : phone;

        if (sessionUserId && countPhoneDigits(phoneForDb) >= 8) {
            const taken = await tx.user.findFirst({
                where: {
                    phone: phoneForDb,
                    NOT: { id: sessionUserId },
                },
                select: { id: true },
            });
            if (!taken) {
                await tx.user.update({
                    where: { id: sessionUserId },
                    data: { phone: phoneForDb },
                });
            }
        }

        const created = await tx.order.create({
            data: {
                name,
                phone: phoneForDb,
                address: address || null,
                comment: comment || null,
                payment: payment === "cash" ? PaymentMethod.CASH : PaymentMethod.CARD,
                delivery: delivery === "delivery" ? DeliveryType.DELIVERY : DeliveryType.PICKUP,
                status: "NEW",
                subtotalBeforeDiscount: verifiedTotal,
                discountAmount: discountAmt,
                totalPrice: payableTotal,
                deliveryZoneId: zoneIdForDb,
                deliveryZoneName: zoneNameSnapshot,
                deliveryPrice: deliveryFee,
                promoCodeId: promoDbId,
                userId: sessionUserId,
                locale,
                changeFrom,
                scheduledFor,
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
    });

    return {
        createdOrderId,
        createdAccessToken,
        verifiedItems,
        deliveryFee,
        zoneNameSnapshot,
        payableForNotify,
        grandBeforePay,
    };
}

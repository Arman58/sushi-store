/**
 * Zod-схема входящего payload-а POST /api/order.
 *
 * Источник истины по бизнес-правилам - БД. Здесь мы валидируем только
 * формат и базовые инварианты (типы, длины, неотрицательные значения).
 *
 * Цена позиции и итог заказа сверяются ПОСЛЕ Zod в роуте - на основе
 * актуальных Modifier.priceDelta из БД (см. resolveOrderLinePrice).
 */

import { z } from "zod";

import { normalizePromoCode } from "@/lib/promo";

// ─── Примитивы ────────────────────────────────────────────────────────────────

const PositiveInt = z.number().int().positive();

const NonNegativeInt = z.number().int().nonnegative();

// ─── OrderItem ────────────────────────────────────────────────────────────────

/**
 * Канонический формат позиции корзины (после Шага 4).
 *
 * Клиент передаёт ТОЛЬКО id выбранных модификаторов; объекты с name/priceDelta
 * сервер поднимает из БД сам - это защита от подмены и единственный источник истины
 * по ценам.
 */
const orderItemSchema = z
    .object({
        productId: PositiveInt,
        name: z.string().min(1, "form.item.invalidName"),
        price: PositiveInt,
        quantity: PositiveInt,
        selectedModifierIds: z.array(PositiveInt).optional(),
    })
    .transform((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        // Дешёвая нормализация дублей; resolveOrderLinePrice всё равно проверит инвариант.
        selectedModifierIds: Array.from(new Set(item.selectedModifierIds ?? [])),
    }));

export type OrderItemPayload = z.infer<typeof orderItemSchema>;

// ─── Phone ────────────────────────────────────────────────────────────────────

export function countPhoneDigits(value: string): number {
    return (value.match(/\d/g) ?? []).length;
}

// ─── Promo ────────────────────────────────────────────────────────────────────

const promoCodeSchema = z
    .string()
    .nullable()
    .optional()
    .transform((v) => {
        if (typeof v !== "string") return null;
        const normalized = normalizePromoCode(v);
        return normalized.length > 0 ? normalized : null;
    });

// ─── Order payload ────────────────────────────────────────────────────────────

/**
 * Honeypot: поле "hp" должно быть пустым или отсутствовать.
 * Любая ненулевая строка - сигнатура бота, отклоняем как 400.
 */
export const orderPayloadSchema = z
    .object({
        name: z
            .string()
            .transform((v) => v.trim())
            .pipe(z.string().min(2, "form.name.tooShort")),
        phone: z
            .string()
            .optional()
            .default("")
            .transform((v) => (typeof v === "string" ? v.trim() : "")),
        address: z
            .string()
            .optional()
            .transform((v) => (typeof v === "string" ? v.trim() : "")),
        comment: z
            .string()
            .optional()
            .transform((v) => (typeof v === "string" ? v.trim() : "")),
        payment: z.enum(["cash", "card"], {
            errorMap: () => ({ message: "form.payment.invalid" }),
        }),
        /** Наличные: сумма, с которой готовить сдачу (֏). null - не нужна. */
        changeFrom: PositiveInt.nullable().optional(),
        /** Предзаказ: ISO-время доставки. null/отсутствует - как можно скорее. */
        scheduledFor: z.string().datetime({ offset: true }).nullable().optional(),
        delivery: z.enum(["delivery", "pickup"], {
            errorMap: () => ({ message: "form.delivery.invalidType" }),
        }),
        items: z
            .array(orderItemSchema)
            .min(1, "form.cart.empty"),
        /**
         * Сумма к оплате: subtotalBeforeDiscount − discountAmount + deliveryPrice
         * (доставка и скидка пересчитываются на сервере).
         */
        totalPrice: PositiveInt,
        /** Сумма позиций без доставки - для сверки с серверным пересчётом (опционально). */
        subtotalBeforeDiscount: NonNegativeInt.optional(),
        /** Сумма скидки по промокоду - для сверки (опционально). */
        discountAmount: NonNegativeInt.optional(),
        deliveryZoneId: PositiveInt.nullable().optional(),
        promoCode: promoCodeSchema,
        locale: z.enum(["hy", "ru", "en"]).optional().default("hy"),
        hp: z
            .string()
            .optional()
            .refine(
                (v) => !v || v.trim().length === 0,
                "Invalid request",
            ),
    })
    .superRefine((data, ctx) => {
        const phoneDigits = countPhoneDigits(data.phone);

        if (data.delivery === "delivery") {
            if (phoneDigits < 8) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["phone"],
                    message: "form.phone.requiredForDelivery",
                });
            }
            if (!data.address || data.address.length < 5) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["address"],
                    message: "form.address.required",
                });
            }
            if (!data.deliveryZoneId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["deliveryZoneId"],
                    message: "form.zone.required",
                });
            }
        } else if (data.phone.length > 0 && phoneDigits < 8) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["phone"],
                message: "form.phone.invalid",
            });
        }
        const hasPromo =
            data.promoCode != null && String(data.promoCode).length > 0;
        const disc = data.discountAmount ?? 0;
        if (!hasPromo && disc > 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["discountAmount"],
                message: "form.discount.withoutPromo",
            });
        }
    });

export type OrderPayload = z.infer<typeof orderPayloadSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Берёт первое осмысленное сообщение из ZodError для UI-уровня
 * («Укажите имя», «Некорректная цена товара» и т.п.).
 *
 * Не пытаемся отдать клиенту полный issue-tree - UI ожидает плоское поле error.
 * Подробности логируем сервером отдельно при необходимости.
 */
export function firstZodMessage(
    error: z.ZodError,
    fallback = "form.invalidPayload",
): string {
    const first = error.issues[0];
    return first?.message ?? fallback;
}

export { NonNegativeInt };

/**
 * Zod-схемы для API-роутов - единый источник валидации входящих данных.
 */

import { z } from "zod";

import { isOrderStatus } from "@/lib/order-status";

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const positiveIntSchema = z.number().int().positive();

export const nonNegativeIntSchema = z.number().int().min(0);

const expiresAtFieldSchema = z
    .union([z.string(), z.null()])
    .optional()
    .superRefine((val, ctx) => {
        if (val === undefined || val === null || val === "") return;
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "expiresAt invalid",
            });
        }
    })
    .transform((val): Date | null | undefined => {
        if (val === undefined) return undefined;
        if (val === null || val === "") return null;
        return new Date(val);
    });

// ─── Public API ───────────────────────────────────────────────────────────────

export const validatePromoBodySchema = z.object({
    code: z.string().min(1, "form.promo.codeRequired"),
    cartAmount: z
        .number()
        .finite()
        .transform((v) => Math.round(v))
        .pipe(z.number().int().positive("form.cart.invalidAmount")),
    deliveryAmount: z
        .number()
        .finite()
        .optional()
        .transform((v) => (v == null ? 0 : Math.max(0, Math.round(v)))),
    items: z
        .array(
            z.object({
                productId: positiveIntSchema,
                quantity: positiveIntSchema,
                price: nonNegativeIntSchema,
            })
        )
        .optional(),
});

export const orderStatusPostBodySchema = z.object({
    id: positiveIntSchema,
    phone: z.string().min(8),
});

export const orderStatusGetQuerySchema = z.object({
    id: z.coerce.number().int().positive(),
    phone: z.string().optional(),
});

export const adminOrderStatusBodySchema = z.object({
    status: z
        .string()
        .min(1)
        .refine(isOrderStatus, "Invalid status"),
});

export const telegramWebhookBodySchema = z.object({
    callback_query: z
        .object({
            id: z.string(),
            data: z.string().optional(),
            message: z
                .object({
                    message_id: z.number(),
                    chat: z.object({ id: z.union([z.number(), z.string()]) }),
                    text: z.string().optional(),
                })
                .optional(),
        })
        .optional(),
});

// ─── Localized JSON fields ───────────────────────────────────────────────────

export const localizedStringSchema = z.object({
    hy: z.string(),
    ru: z.string(),
    en: z.string(),
});

export const localizedRequiredSchema = localizedStringSchema.superRefine(
    (data, ctx) => {
        if (!data.hy.trim() && !data.ru.trim() && !data.en.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "name is required",
            });
        }
    },
);

export const localizedOptionalSchema = localizedStringSchema.optional();

// ─── Admin: categories ────────────────────────────────────────────────────────

export const adminCategoryCreateSchema = z.object({
    name: localizedRequiredSchema,
});

export const adminCategoryPatchSchema = z
    .object({
        name: localizedRequiredSchema.optional(),
        /** Cloudinary URL или null - убрать фото. */
        image: z.string().url().max(2048).nullable().optional(),
        isActive: z.boolean().optional(),
        position: nonNegativeIntSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });

// ─── Admin: delivery zones ────────────────────────────────────────────────────

export const adminDeliveryZoneCreateSchema = z.object({
    name: localizedRequiredSchema,
    deliveryPrice: nonNegativeIntSchema,
    minOrderAmount: nonNegativeIntSchema,
    description: localizedStringSchema.optional().default({ hy: "", ru: "", en: "" }),
    requiresManagerApproval: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
});

export const adminDeliveryZonePatchSchema = z
    .object({
        name: localizedRequiredSchema.optional(),
        deliveryPrice: nonNegativeIntSchema.optional(),
        minOrderAmount: nonNegativeIntSchema.optional(),
        description: localizedStringSchema.optional(),
        requiresManagerApproval: z.boolean().optional(),
        isActive: z.boolean().optional(),
        position: nonNegativeIntSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Nothing to update");

// ─── Admin: promocodes ────────────────────────────────────────────────────────

export const adminPromoCreateSchema = z.object({
    code: z.string().trim().min(1, "code is required"),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: positiveIntSchema,
    minOrderAmount: nonNegativeIntSchema.nullable().optional(),
    maxUsages: positiveIntSchema.nullable().optional(),
    expiresAt: expiresAtFieldSchema,
    isActive: z.boolean().optional().default(true),
});

export const adminPromoPatchSchema = z
    .object({
        code: z.string().trim().min(1).optional(),
        discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
        discountValue: positiveIntSchema.optional(),
        minOrderAmount: nonNegativeIntSchema.nullable().optional(),
        maxUsages: positiveIntSchema.nullable().optional(),
        expiresAt: expiresAtFieldSchema,
        isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Nothing to update");

// ─── Admin: products ──────────────────────────────────────────────────────────

export const adminProductCreateSchema = z.object({
    name: localizedRequiredSchema,
    price: nonNegativeIntSchema,
    categoryId: positiveIntSchema,
    description: localizedStringSchema.nullable().optional(),
    composition: localizedStringSchema.nullable().optional(),
    weight: positiveIntSchema.nullable().optional(),
    images: z.array(z.string()).optional(),
    mainImage: z.string().nullable().optional(),
    isActive: z.boolean().optional().default(true),
    slug: z.string().trim().min(1).optional(),
    modifierGroups: z.unknown().optional(),
    minQty: z.number().int().min(1).max(999).optional().default(1),
    maxQty: z.number().int().min(1).max(999).nullable().optional(),
    /** Кросс-селл «с этим берут»: id предложений, порядок = приоритет. */
    upsellIds: z.array(positiveIntSchema).max(12).optional(),
});

export const adminProductPatchSchema = z
    .object({
        name: localizedRequiredSchema.optional(),
        price: positiveIntSchema.optional(),
        categoryId: positiveIntSchema.nullable().optional(),
        description: localizedStringSchema.nullable().optional(),
        composition: localizedStringSchema.nullable().optional(),
        weight: positiveIntSchema.nullable().optional(),
        images: z.array(z.string()).optional(),
        mainImage: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        slug: z.string().trim().min(1).optional(),
        modifierGroups: z.unknown().optional(),
        minQty: z.number().int().min(1).max(999).optional(),
        maxQty: z.number().int().min(1).max(999).nullable().optional(),
        upsellIds: z.array(positiveIntSchema).max(12).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Nothing to update");

// ─── Cart sync ────────────────────────────────────────────────────────────────

const cartModifierSnapshotSchema = z.object({
    id: positiveIntSchema,
    name: z.string().max(200),
    priceDelta: z.number().int(),
});

const cartSyncItemSchema = z.object({
    cartItemId: z.string().min(1).max(200),
    productId: positiveIntSchema,
    name: z.string().min(1).max(200),
    basePrice: nonNegativeIntSchema,
    quantity: z.number().int().positive().max(100),
    selectedModifiers: z.array(cartModifierSnapshotSchema).max(30),
    calculatedItemPrice: nonNegativeIntSchema,
    image: z.string().max(2000).nullable().optional(),
});

export const cartSyncBodySchema = z.object({
    items: z.array(cartSyncItemSchema).max(50),
    appliedPromoCode: z.string().trim().max(64).nullable().optional(),
});

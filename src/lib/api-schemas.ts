/**
 * Zod-схемы для API-роутов — единый источник валидации входящих данных.
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
    code: z.string().min(1, "Укажите промокод"),
    cartAmount: z
        .number()
        .finite()
        .transform((v) => Math.round(v))
        .pipe(z.number().int().positive("Корзина пустая или сумма указана некорректно")),
    deliveryAmount: z
        .number()
        .finite()
        .optional()
        .transform((v) => (v == null ? 0 : Math.max(0, Math.round(v)))),
});

export const orderStatusPostBodySchema = z.object({
    id: positiveIntSchema,
    phone: z.string().min(8),
});

export const orderStatusGetQuerySchema = z.object({
    id: z.coerce.number().int().positive(),
    phone: z.string().min(8),
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

// ─── Admin: categories ────────────────────────────────────────────────────────

export const adminCategoryCreateSchema = z.object({
    name: z.string().trim().min(1, "name is required"),
});

// ─── Admin: delivery zones ────────────────────────────────────────────────────

export const adminDeliveryZoneCreateSchema = z.object({
    name: z.string().trim().min(1, "name is required"),
    deliveryPrice: nonNegativeIntSchema,
    minOrderAmount: nonNegativeIntSchema,
    description: z.string().optional().default(""),
    requiresManagerApproval: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
});

export const adminDeliveryZonePatchSchema = z
    .object({
        name: z.string().trim().min(1).optional(),
        deliveryPrice: nonNegativeIntSchema.optional(),
        minOrderAmount: nonNegativeIntSchema.optional(),
        description: z.string().optional(),
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
    name: z.string().trim().min(1, "name is required"),
    price: nonNegativeIntSchema,
    categoryId: positiveIntSchema,
    description: z.string().nullable().optional(),
    composition: z.string().nullable().optional(),
    weight: positiveIntSchema.nullable().optional(),
    images: z.array(z.string()).optional(),
    mainImage: z.string().nullable().optional(),
    isActive: z.boolean().optional().default(true),
    slug: z.string().trim().min(1).optional(),
    modifierGroups: z.unknown().optional(),
});

export const adminProductPatchSchema = z
    .object({
        name: z.string().trim().min(1).optional(),
        price: positiveIntSchema.optional(),
        categoryId: positiveIntSchema.nullable().optional(),
        description: z.string().nullable().optional(),
        composition: z.string().nullable().optional(),
        weight: positiveIntSchema.nullable().optional(),
        images: z.array(z.string()).optional(),
        mainImage: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        slug: z.string().trim().min(1).optional(),
        modifierGroups: z.unknown().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "Nothing to update");

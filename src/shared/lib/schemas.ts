/**
 * Shared Zod schemas used across checkout, order-status, and API validation.
 * Single source of truth for form shapes and error messages.
 */

import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const digitsOnly = (value: string) => value.replace(/\D/g, "");

// ─── Phone ────────────────────────────────────────────────────────────────────

export const phoneSchema = z
    .string()
    .min(1, "Укажите телефон")
    .refine(
        (value) => digitsOnly(value).length >= 8,
        "Укажите номер полностью",
    );

// ─── Checkout ─────────────────────────────────────────────────────────────────

export const checkoutSchema = z
    .object({
        name: z
            .string()
            .min(1, "Введите имя")
            .min(2, "Минимум 2 символа"),
        phone: phoneSchema,
        delivery: z.enum(["delivery", "pickup"]),
        address: z.string().default(""),
        comment: z.string().default(""),
        payment: z.enum(["cash", "card"]).default("cash"),
        hp: z.string().default(""),   // honeypot — must stay empty
    })
    .superRefine((data, ctx) => {
        if (data.delivery === "delivery" && (!data.address || data.address.trim().length < 5)) {
            ctx.addIssue({
                code: z.ZodIssueCode.too_small,
                minimum: 5,
                type: "string",
                inclusive: true,
                path: ["address"],
                message: "Укажите адрес доставки",
            });
        }
    });

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
export type PaymentMethod = CheckoutFormValues["payment"];
export type DeliveryType = CheckoutFormValues["delivery"];

// ─── Order status lookup ───────────────────────────────────────────────────────

export const orderStatusSchema = z.object({
    id: z
        .string()
        .min(1, "Введите номер заказа")
        .refine(
            (value) => {
                const n = Number(value);
                return Number.isFinite(n) && n > 0;
            },
            "Номер должен быть больше 0",
        ),
    phone: phoneSchema,
});

export type OrderStatusFormValues = z.infer<typeof orderStatusSchema>;

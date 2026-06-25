import { z } from "zod";

function normalizeArmenianPhoneDigits(value: string): string {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("374") ? digits.slice(3) : digits;
}

export type SchemaMessages = {
    phoneRequired: string;
    phoneInvalid: string;
    phoneRequiredForDelivery: string;
    nameRequired: string;
    nameTooShort: string;
    emailInvalid: string;
    addressRequired: string;
    zoneRequired: string;
    orderIdRequired: string;
    orderIdInvalid: string;
};

export function createPhoneSchema(messages: Pick<SchemaMessages, "phoneRequired" | "phoneInvalid">) {
    return z
        .string()
        .min(1, messages.phoneRequired)
        .transform((val) => normalizeArmenianPhoneDigits(val))
        .pipe(z.string().length(8, messages.phoneInvalid));
}

function checkoutPhoneDigits(value: string): string {
    return normalizeArmenianPhoneDigits(value);
}

export function createCheckoutSchema(messages: SchemaMessages) {
    return z
        .object({
            name: z
                .string()
                .min(1, messages.nameRequired)
                .min(2, messages.nameTooShort),
            email: z
                .string()
                .default("")
                .refine(
                    (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
                    messages.emailInvalid,
                ),
            phone: z.string().default(""),
            delivery: z.enum(["delivery", "pickup"]),
            address: z.string().default(""),
            apartment: z.string().default(""),
            comment: z.string().default(""),
            saveAddress: z.boolean().default(false),
            saveAddressLabel: z.string().default(""),
            payment: z.enum(["cash", "card"]).default("cash"),
            deliveryZoneId: z.number().int().positive().optional(),
            hp: z.string().default(""),
        })
        .superRefine((data, ctx) => {
            const phoneDigits = checkoutPhoneDigits(data.phone);

            if (data.delivery === "delivery") {
                if (phoneDigits.length !== 8) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["phone"],
                        message: messages.phoneRequiredForDelivery,
                    });
                }
                if (!data.address || data.address.trim().length < 5) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.too_small,
                        minimum: 5,
                        type: "string",
                        inclusive: true,
                        path: ["address"],
                        message: messages.addressRequired,
                    });
                }
                if (data.deliveryZoneId == null || data.deliveryZoneId <= 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["deliveryZoneId"],
                        message: messages.zoneRequired,
                    });
                }
            } else if (data.phone.trim().length > 0 && phoneDigits.length !== 8) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["phone"],
                    message: messages.phoneInvalid,
                });
            }
        });
}

export function createOrderStatusSchema(messages: SchemaMessages) {
    return z.object({
        id: z
            .string()
            .min(1, messages.orderIdRequired)
            .refine(
                (value) => {
                    const n = Number(value);
                    return Number.isFinite(n) && n > 0;
                },
                messages.orderIdInvalid,
            ),
        phone: createPhoneSchema(messages),
    });
}

export type OrderStatusFormValues = z.infer<
    ReturnType<typeof createOrderStatusSchema>
>;

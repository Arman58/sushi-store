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
    changeAmountRequired: string;
    scheduleRequired: string;
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
            // Сдача (наличные): zod вырезает неописанные ключи, поэтому поля
            // ОБЯЗАНЫ быть здесь - иначе needsChange/changeAmount теряются
            // при сабмите и заказ уходит как «без сдачи».
            needsChange: z.boolean().default(false),
            changeAmount: z.number().int().positive().nullable().default(null),
            deliveryZoneId: z.number().int().positive().optional(),
        /** Когда доставить: сразу или ко времени. */
        scheduleMode: z.enum(["asap", "scheduled"]).default("asap"),
        /** ISO-время предзаказа; null - как можно скорее. */
        scheduledFor: z.string().nullable().default(null),
            hp: z.string().default(""),
        })
        .superRefine((data, ctx) => {
            if (data.scheduleMode === "scheduled" && !data.scheduledFor) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["scheduledFor"],
                    message: messages.scheduleRequired,
                });
            }
            if (
                data.payment === "cash" &&
                data.needsChange &&
                (data.changeAmount == null || data.changeAmount <= 0)
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["changeAmount"],
                    message: messages.changeAmountRequired,
                });
            }

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
    });
}

export type OrderStatusFormValues = z.infer<
    ReturnType<typeof createOrderStatusSchema>
>;

import { z } from "zod";

export const adminOrderPatchSchema = z
    .object({
        etaMinutes: z.number().int().positive().optional(),
        estimatedDeliveryAt: z.string().min(1).optional(),
    })
    .refine(
        (data) => data.etaMinutes !== undefined || data.estimatedDeliveryAt !== undefined,
        { message: "Укажите etaMinutes или estimatedDeliveryAt" },
    );

export type AdminOrderPatchPayload = z.infer<typeof adminOrderPatchSchema>;

export function firstZodMessage(
    error: z.ZodError,
    fallback = "Неверный формат данных",
): string {
    const first = error.issues[0];
    return first?.message ?? fallback;
}

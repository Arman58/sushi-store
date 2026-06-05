/**
 * Zod-схема payload-а ModifierGroup + Modifier для admin API.
 *
 * Контракт:
 *   - id ОТСУТСТВУЕТ → новая сущность (create).
 *   - id ПРИСУТСТВУЕТ → существующая сущность (update).
 *
 * При update сервер обязан проверить принадлежность сущности текущему товару,
 * иначе через подмену id можно править чужие записи (anti-IDOR).
 */

import { z } from "zod";

const PositiveInt = z.number().int().positive();
const NonNegativeInt = z.number().int().nonnegative();
const SignedInt = z.number().int();

// ─── Modifier (option) ────────────────────────────────────────────────────────

export const adminModifierSchema = z.object({
    /** Если задан — update; если нет — create. */
    id: PositiveInt.optional(),
    name: z
        .string()
        .transform((v) => v.trim())
        .pipe(z.string().min(1, "Название опции обязательно")),
    /** Может быть отрицательной — например, скидка за «без сыра». */
    priceDelta: SignedInt.default(0),
    position: NonNegativeInt.default(0),
});

export type AdminModifierOptionInput = z.infer<typeof adminModifierSchema>;

// ─── ModifierGroup ────────────────────────────────────────────────────────────

export const adminModifierGroupSchema = z.object({
    id: PositiveInt.optional(),
    name: z
        .string()
        .transform((v) => v.trim())
        .pipe(z.string().min(1, "Название группы обязательно")),
    required: z.boolean().default(false),
    /** 0 = без верхней границы. */
    maxChoices: NonNegativeInt.default(1),
    position: NonNegativeInt.default(0),
    modifiers: z.array(adminModifierSchema).default([]),
});

export type AdminModifierGroupInput = z.infer<typeof adminModifierGroupSchema>;

// ─── Top-level payload ────────────────────────────────────────────────────────

/**
 * Принимаем массив групп либо undefined/null (значит «не трогать модификаторы»
 * на PATCH; для POST интерпретируется как «создать товар без групп»).
 */
export const adminModifierGroupsListSchema = z
    .array(adminModifierGroupSchema)
    .optional()
    .nullable()
    .transform((v) => v ?? []);

/**
 * Совместимый с прежним кодом результат разбора. Используется в роутах,
 * чтобы не плодить новые pattern-ы.
 *
 * @returns { ok: true, groups } при успешной валидации,
 *          { ok: false, error } с первым осмысленным сообщением.
 */
export function parseAdminModifierGroupsPayload(
    value: unknown,
):
    | { ok: true; groups: AdminModifierGroupInput[] }
    | { ok: false; error: string } {
    const parsed = adminModifierGroupsListSchema.safeParse(value);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        const path = first?.path.length
            ? `modifierGroups${first.path.map((p) => `[${String(p)}]`).join("")}`
            : "modifierGroups";
        return {
            ok: false,
            error: `${path}: ${first?.message ?? "invalid payload"}`,
        };
    }
    return { ok: true, groups: parsed.data };
}

import { z } from "zod";

export const savedAddressBodySchema = z
    .object({
        label: z.string().trim().min(1).max(50),
        street: z.string().trim().min(3).max(200),
        apartment: z.string().trim().max(50).optional(),
        comment: z.string().trim().max(500).optional(),
    })
    .transform((data) => ({
        label: data.label,
        street: data.street,
        apartment: data.apartment && data.apartment.length > 0 ? data.apartment : null,
        comment: data.comment && data.comment.length > 0 ? data.comment : null,
    }));

export type SavedAddressDto = {
    id: number;
    label: string;
    street: string;
    apartment: string | null;
    comment: string | null;
    createdAt: string;
};

export function formatSavedAddressLine(
    street: string,
    apartment: string | null | undefined,
): string {
    const base = street.trim();
    const apt = apartment?.trim();
    if (!apt) return base;
    return `${base}, ${apt}`;
}

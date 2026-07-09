import { asLocalizedRecord, type LocalizedJson } from "@/lib/i18n-utils";

export function emptyAdminLocalized(): LocalizedJson {
    return { hy: "", ru: "", en: "" };
}

/** Flatten Prisma translation rows into `{ hy, ru, en }` for admin UI. */
export function translationsToLocalized(
    translations: unknown,
    fieldName = "name",
): LocalizedJson {
    return asLocalizedRecord(translations, fieldName) ?? emptyAdminLocalized();
}

export function localizedEntries(
    value: LocalizedJson | Record<string, string>,
): Array<{ locale: string; text: string }> {
    return ["hy", "ru", "en"].map((locale) => ({
        locale,
        text: typeof value[locale] === "string" ? value[locale] : "",
    }));
}

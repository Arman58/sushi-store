import { cookies } from "next/headers";

import { routing } from "@/i18n/routing";

/** Язык админки - из cookie NEXT_LOCALE (тот же, что у витрины). */
export async function resolveAdminLocale(): Promise<string> {
    const store = await cookies();
    const cookieLocale = store.get("NEXT_LOCALE")?.value;
    return cookieLocale &&
        (routing.locales as readonly string[]).includes(cookieLocale)
        ? cookieLocale
        : routing.defaultLocale;
}

import { cookies } from "next/headers";

import {
    parseThemeMode,
    THEME_COOKIE,
    type ThemeMode,
} from "@/lib/theme-preference";

/** Server-side theme from cookie (SSR `data-theme` on `<html>`). */
export async function resolveThemeMode(): Promise<ThemeMode> {
    const store = await cookies();
    return parseThemeMode(store.get(THEME_COOKIE)?.value) ?? "light";
}

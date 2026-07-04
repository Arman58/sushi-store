import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { routing } from "@/i18n/routing";
import { requireAdminSession } from "@/lib/admin-auth-server";

import { AdminShell } from "../ui/admin-sidebar";

/** Язык админки берём из cookie NEXT_LOCALE (тот же, что и у витрины). */
async function resolveAdminLocale(): Promise<string> {
    const store = await cookies();
    const cookieLocale = store.get("NEXT_LOCALE")?.value;
    return cookieLocale &&
        (routing.locales as readonly string[]).includes(cookieLocale)
        ? cookieLocale
        : routing.defaultLocale;
}

export default async function AdminDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requireAdminSession();

    const locale = await resolveAdminLocale();
    const messages = (await import(`../../../messages/${locale}.json`)).default;

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <AdminShell>{children}</AdminShell>
        </NextIntlClientProvider>
    );
}

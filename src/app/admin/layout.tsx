import Box from "@mui/material/Box";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { resolveAdminLocale } from "@/lib/admin-locale";

/**
 * Корневой layout /admin/* - изолирован от витрины.
 * LayoutShell подключается только в src/app/(store)/layout.tsx.
 * Каркас: sidebar + контент - в AdminShell (admin/(dashboard)/layout.tsx).
 */
export default async function AdminRootLayout({
    children,
}: {
    children: ReactNode;
}) {
    const locale = await resolveAdminLocale();
    const messages = (await import(`../../messages/${locale}.json`)).default;

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <Box
                component="div"
                data-admin-root
                sx={{
                    minHeight: "100vh",
                    bgcolor: "background.default",
                    color: "text.primary",
                }}
            >
                {children}
            </Box>
        </NextIntlClientProvider>
    );
}

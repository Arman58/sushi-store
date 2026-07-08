import Box from "@mui/material/Box";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { resolveAdminLocale } from "@/lib/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
    const locale = await resolveAdminLocale();
    const t = await getTranslations({ locale, namespace: "admin.kitchen" });

    return {
        title: t("title"),
        robots: { index: false, follow: false },
    };
}

export default function KitchenLayout({ children }: { children: ReactNode }) {
    return (
        <Box
            component="div"
            data-kitchen-root
            sx={{
                bgcolor: "#F8FAFC",
                minHeight: "100vh",
                color: "#0F172A",
                fontFamily: "Inter, sans-serif",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {children}
        </Box>
    );
}

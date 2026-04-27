// src/app/layout.tsx
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LayoutShell } from "@/shared/ui";

import { AppProviders } from "./providers";

export const metadata: Metadata = {
    metadataBase: new URL("https://sushi-store.vercel.app"),
    title: "East West | Sushi, Pizza and More",
    description:
        "East West — суши, пицца, шаурма, лахмаджо, стрипсы, фри и многое другое с доставкой.",
    icons: { icon: "/east-west-logo.png" },
    openGraph: {
        title: "East West Delivery — Суши, Пицца и Лахмаджо в Ереване",
        description:
            "Готовим с душой. Доставка за 45 минут. Закажи любимые блюда прямо сейчас!",
        siteName: "East West",
        images: [{ url: "/east-west-logo.png", width: 800, height: 800 }],
        locale: "ru_RU",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "East West Delivery",
        description: "Суши, Пицца и Лахмаджо с доставкой.",
        images: ["/east-west-logo.png"],
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ru">
        <body suppressHydrationWarning>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
            <AppProviders>
                <LayoutShell>{children}</LayoutShell>
            </AppProviders>
        </AppRouterCacheProvider>
        </body>
        </html>
    );
}

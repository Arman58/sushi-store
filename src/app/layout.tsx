// src/app/layout.tsx
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LayoutShell } from "@/shared/ui";

import { AppProviders } from "./providers";

export const metadata: Metadata = {
    title: "East West | Sushi, Pizza and More",
    description:
        "East West — суши, пицца, шаурма, лахмаджо, стрипсы, фри и многое другое с доставкой.",
    icons: { icon: "/east-west-logo.png" },
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

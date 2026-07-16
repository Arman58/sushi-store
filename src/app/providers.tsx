"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { type ReactNode, useEffect, useState } from "react";

import { CartSyncProvider, CartValidationProvider } from "@/features/cart";
import {
    ewThemeStorageManager,
    type ThemeMode,
} from "@/lib/theme-preference";
import theme from "@/shared/ui/theme";
import { ThemeInitScript } from "@/shared/ui/theme-init-script";
import { ThemePreferenceProvider } from "@/shared/ui/theme-preference-context";

type AppProvidersProps = {
    children: ReactNode;
    initialTheme: ThemeMode;
    nonce?: string;
};

export function AppProviders({
    children,
    initialTheme,
    nonce,
}: AppProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1_000,
                        gcTime: 5 * 60 * 1_000,
                        retry: 2,
                        refetchOnWindowFocus: false,
                    },
                },
            }),
    );

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            document.documentElement.classList.add("theme-anim");
        });
        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <>
            {/* SSR-only inject — avoids React 19 script-in-component warning. */}
            <ThemeInitScript nonce={nonce} />
            <SessionProvider>
                <QueryClientProvider client={queryClient}>
                    <CartSyncProvider>
                        <CartValidationProvider>
                            <ThemePreferenceProvider initialTheme={initialTheme}>
                                <ThemeProvider
                                    theme={theme}
                                    defaultMode={initialTheme}
                                    storageManager={ewThemeStorageManager}
                                    disableTransitionOnChange
                                >
                                    <CssBaseline />
                                    {/* prefers-reduced-motion: глобально гасит
                                        анимации framer-motion во всех 20+ местах
                                        разом (a11y, вестибулярные расстройства). */}
                                    <MotionConfig reducedMotion="user">
                                        {children}
                                    </MotionConfig>
                                </ThemeProvider>
                            </ThemePreferenceProvider>
                        </CartValidationProvider>
                    </CartSyncProvider>
                </QueryClientProvider>
            </SessionProvider>
        </>
    );
}

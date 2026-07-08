"use client";

import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { type ReactNode, useEffect, useState } from "react";

import {
    ewThemeStorageManager,
    THEME_STORAGE_KEY,
    type ThemeMode,
} from "@/lib/theme-preference";
import theme from "@/shared/ui/theme";
import { ThemePreferenceProvider } from "@/shared/ui/theme-preference-context";

type AppProvidersProps = {
    children: ReactNode;
    initialTheme: ThemeMode;
};

export function AppProviders({ children, initialTheme }: AppProvidersProps) {
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
            <InitColorSchemeScript
                attribute="data-theme"
                defaultMode={initialTheme}
                modeStorageKey={THEME_STORAGE_KEY}
            />
            <SessionProvider>
                <QueryClientProvider client={queryClient}>
                    <ThemePreferenceProvider initialTheme={initialTheme}>
                        <ThemeProvider
                            theme={theme}
                            defaultMode={initialTheme}
                            storageManager={ewThemeStorageManager}
                            disableTransitionOnChange
                        >
                            <CssBaseline />
                            {children}
                        </ThemeProvider>
                    </ThemePreferenceProvider>
                </QueryClientProvider>
            </SessionProvider>
        </>
    );
}

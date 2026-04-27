"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, type ReactNode } from "react";

import theme from "@/shared/ui/theme";

type AppProvidersProps = {
    children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
    // useRef gives one QueryClient per tree — stable across React 19 StrictMode double-renders
    const queryClientRef = useRef<QueryClient | null>(null);
    if (!queryClientRef.current) {
        queryClientRef.current = new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1_000,       // 1 min — menu data rarely changes mid-session
                    gcTime: 5 * 60 * 1_000,       // keep cache 5 min after last subscriber
                    retry: 2,
                    refetchOnWindowFocus: false,
                },
            },
        });
    }

    return (
        <QueryClientProvider client={queryClientRef.current}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </QueryClientProvider>
    );
}

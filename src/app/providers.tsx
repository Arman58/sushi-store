"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { type ReactNode, useState } from "react";

import theme from "@/shared/ui/theme";

type AppProvidersProps = {
    children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1_000, // 1 min — menu data rarely changes mid-session
                        gcTime: 5 * 60 * 1_000, // keep cache 5 min after last subscriber
                        retry: 2,
                        refetchOnWindowFocus: false,
                    },
                },
            }),
    );

    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {children}
                </ThemeProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}

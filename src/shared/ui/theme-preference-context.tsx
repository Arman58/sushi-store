"use client";

import { createContext, type ReactNode,useContext } from "react";

import type { ThemeMode } from "@/lib/theme-preference";

const ThemePreferenceContext = createContext<ThemeMode>("light");

type ThemePreferenceProviderProps = {
    initialTheme: ThemeMode;
    children: ReactNode;
};

export function ThemePreferenceProvider({
    initialTheme,
    children,
}: ThemePreferenceProviderProps) {
    return (
        <ThemePreferenceContext.Provider value={initialTheme}>
            {children}
        </ThemePreferenceContext.Provider>
    );
}

export function useInitialThemeMode(): ThemeMode {
    return useContext(ThemePreferenceContext);
}

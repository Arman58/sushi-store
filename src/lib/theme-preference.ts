export const THEME_STORAGE_KEY = "ew_theme";
export const THEME_COOKIE = "ew_theme";

export type ThemeMode = "light" | "dark";

export function parseThemeMode(
    value: string | undefined | null,
): ThemeMode | null {
    if (value === "light" || value === "dark") return value;
    return null;
}

function readThemeFromCookieClient(): ThemeMode | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]+)`),
    );
    const raw = match?.[1];
    return parseThemeMode(raw ? decodeURIComponent(raw) : null);
}

function readThemeFromLocalStorage(): ThemeMode | null {
    if (typeof window === "undefined") return null;
    try {
        return parseThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
        return null;
    }
}

/** Client-side resolved theme (cookie → localStorage → light). */
export function readStoredThemeMode(): ThemeMode {
    return (
        readThemeFromCookieClient() ??
        readThemeFromLocalStorage() ??
        "light"
    );
}

/** Persist theme for SSR, MUI storageManager, and toggles. */
export function writeThemePreference(mode: ThemeMode): void {
    if (typeof document === "undefined") return;
    if (document.documentElement.dataset.theme !== mode) {
        document.documentElement.dataset.theme = mode;
    }
    try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
        /* private browsing */
    }
    const secure =
        typeof window !== "undefined" && window.location.protocol === "https:"
            ? "; secure"
            : "";
    document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax${secure}`;
}

export function readThemeFromDocument(): ThemeMode {
    if (typeof document === "undefined") return "light";
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** MUI ThemeProvider storage — single source of truth for `ew_theme`. */
export const ewThemeStorageManager = ({
    key: _key,
    storageWindow,
}: {
    key: string;
    storageWindow?: Window | null;
}) => {
    const win = storageWindow ?? (typeof window !== "undefined" ? window : null);

    return {
        get(defaultValue: unknown) {
            if (typeof window === "undefined") return defaultValue;
            const stored = readStoredThemeMode();
            return stored ?? defaultValue;
        },
        set(mode: unknown) {
            if (mode !== "light" && mode !== "dark") return;
            writeThemePreference(mode);
        },
        subscribe(handler: (value: unknown) => void) {
            if (!win) return () => {};
            // Только cross-tab sync: MutationObserver на data-theme создавал
            // feedback loop с MUI set() и блокировал main thread после кликов.
            const onStorage = (event: StorageEvent) => {
                if (event.key === THEME_STORAGE_KEY) {
                    handler(readStoredThemeMode());
                }
            };
            win.addEventListener("storage", onStorage);
            return () => {
                win.removeEventListener("storage", onStorage);
            };
        },
    };
};

/** Inline fallback before MUI InitColorSchemeScript hydrates. */
export const THEME_INIT_SCRIPT = `try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]+)/);var c=m?decodeURIComponent(m[1]):null;var t=c||localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches);var mode=d?"dark":"light";document.documentElement.dataset.theme=mode;if(t==="dark"||t==="light"){document.cookie="${THEME_COOKIE}="+t+"; path=/; max-age=31536000; samesite=lax"}}catch(e){document.documentElement.dataset.theme="light"}`;

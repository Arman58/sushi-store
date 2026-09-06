/** Shared PWA-install timing keys — keep checkout / welcome / prompt in sync. */

export const PWA_JUST_ORDERED_KEY = "east-west-just-ordered";
export const PWA_UI_BLOCK_EVENT = "ew:pwa-ui-block";
export const WELCOME_PROMO_SEEN_KEY = "hasSeenWelcomePromo";

export function markJustOrdered(): void {
    try {
        sessionStorage.setItem(PWA_JUST_ORDERED_KEY, "1");
    } catch {
        /* private mode */
    }
}

export function peekJustOrdered(): boolean {
    try {
        return sessionStorage.getItem(PWA_JUST_ORDERED_KEY) === "1";
    } catch {
        return false;
    }
}

export function clearJustOrdered(): void {
    try {
        sessionStorage.removeItem(PWA_JUST_ORDERED_KEY);
    } catch {
        /* ignore */
    }
}

export function hasSeenWelcomePromo(): boolean {
    try {
        const seen = localStorage.getItem(WELCOME_PROMO_SEEN_KEY);
        return seen === "1" || seen === "true";
    } catch {
        return true;
    }
}

export function isStoreHomePath(pathname: string): boolean {
    return pathname === "/" || /^\/[a-z]{2}\/?$/.test(pathname);
}

export function dispatchPwaUiBlock(blocked: boolean): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(PWA_UI_BLOCK_EVENT, { detail: blocked }));
}

export function todayKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

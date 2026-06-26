import { SITE_URL } from "@/lib/site-config";

/** Apex-домен продакшена (канонический — www). */
export const APEX_HOSTNAMES = ["eastwestnh.com"] as const;

export const CANONICAL_HOSTNAME = "www.eastwestnh.com";

/** Пути PWA/SW — не редиректим на www, иначе ломается регистрация Service Worker. */
const PWA_ASSET_PATHS = ["/sw.js", "/manifest.webmanifest"] as const;

export function isPwaAssetPath(pathname: string): boolean {
    return PWA_ASSET_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
}

const APEX_TO_CANONICAL: Record<string, string> = {
    "eastwestnh.com": CANONICAL_HOSTNAME,
};

/** Vercel Preview / локальная разработка — не редиректим на боевой домен. */
export function isPreviewDeploymentHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return (
        host.endsWith(".vercel.app") ||
        host === "localhost" ||
        host.endsWith(".localhost")
    );
}

export function isPreviewDeployment(): boolean {
    return process.env.VERCEL_ENV === "preview";
}

export function shouldSkipCanonicalRedirect(hostname?: string): boolean {
    if (isPreviewDeployment()) return true;
    if (hostname && isPreviewDeploymentHost(hostname)) return true;
    return false;
}

export function isApexHost(hostname?: string): boolean {
    const host =
        hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
    return (APEX_HOSTNAMES as readonly string[]).includes(host);
}

/** Канонический hostname (www, не apex). */
export function resolveCanonicalHostname(hostname: string): string {
    if (SITE_URL) {
        try {
            const envHost = new URL(SITE_URL).hostname;
            return APEX_TO_CANONICAL[envHost] ?? envHost;
        } catch {
            /* fall through */
        }
    }

    return APEX_TO_CANONICAL[hostname] ?? hostname;
}

export function getCanonicalHostname(): string {
    if (SITE_URL) {
        try {
            return resolveCanonicalHostname(new URL(SITE_URL).hostname);
        } catch {
            /* fall through */
        }
    }

    return CANONICAL_HOSTNAME;
}

export function shouldRedirectToCanonicalHost(currentHostname: string): string | null {
    if (shouldSkipCanonicalRedirect(currentHostname)) {
        return null;
    }

    if (isApexHost(currentHostname)) {
        return CANONICAL_HOSTNAME;
    }

    const canonical = getCanonicalHostname();
    if (canonical !== currentHostname) {
        return canonical;
    }
    return null;
}

export function getCanonicalOrigin(): string {
    return `https://${getCanonicalHostname()}`;
}

export function buildWwwUrl(
    pathname = "/",
    search = "",
    hash = "",
): string {
    return `https://${CANONICAL_HOSTNAME}${pathname}${search}${hash}`;
}

/**
 * @deprecated Редирект apex → www выполняется только на Edge (proxy.ts).
 * Клиентский редирект отменён — он прерывал регистрацию Service Worker.
 */
export function buildCanonicalRedirectScript(): string {
    return "";
}

/** @deprecated Используйте серверный 308 в proxy.ts */
export function redirectToCanonicalHost(): boolean {
    return false;
}

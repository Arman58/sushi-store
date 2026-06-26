import { SITE_URL } from "@/lib/site-config";

/** Apex-домены, с которых push/SW не работают (sw.js редиректится на www). */
export const APEX_HOSTNAMES = ["eastwestnh.com"] as const;

export const CANONICAL_HOSTNAME = "www.eastwestnh.com";

const APEX_TO_CANONICAL: Record<string, string> = {
    "eastwestnh.com": CANONICAL_HOSTNAME,
};

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
 * Inline-скрипт: редирект до React/SW.
 * Хардкод — не зависит от env при сборке.
 */
export function buildCanonicalRedirectScript(): string {
    return `(function(){try{if(location.hostname==="eastwestnh.com"){location.replace("https://www.eastwestnh.com"+location.pathname+location.search+location.hash);}}catch(e){}})();`;
}

/** Редирект на канонический хост (клиент). */
export function redirectToCanonicalHost(): boolean {
    if (typeof window === "undefined") return false;

    const canonicalHost = shouldRedirectToCanonicalHost(window.location.hostname);
    if (!canonicalHost) return false;

    window.location.replace(
        buildWwwUrl(window.location.pathname, window.location.search, window.location.hash),
    );
    return true;
}

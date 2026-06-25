const APEX_TO_CANONICAL: Record<string, string> = {
    "eastwestnh.com": "www.eastwestnh.com",
};

/** Канонический hostname (www, не apex). */
export function resolveCanonicalHostname(hostname: string): string {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (fromEnv) {
        try {
            const envHost = new URL(fromEnv).hostname;
            return APEX_TO_CANONICAL[envHost] ?? envHost;
        } catch {
            /* fall through */
        }
    }

    return APEX_TO_CANONICAL[hostname] ?? hostname;
}

export function getCanonicalHostname(): string | null {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (fromEnv) {
        try {
            return resolveCanonicalHostname(new URL(fromEnv).hostname);
        } catch {
            /* fall through */
        }
    }

    return "www.eastwestnh.com";
}

export function shouldRedirectToCanonicalHost(currentHostname: string): string | null {
    const canonical = getCanonicalHostname();
    if (canonical && canonical !== currentHostname) {
        return canonical;
    }
    return null;
}

export function getCanonicalOrigin(): string | null {
    const canonical = getCanonicalHostname();
    if (!canonical) return null;
    return `https://${canonical}`;
}

/** Список apex-хостов, с которых нужен редирект (для inline-скрипта). */
export function getApexHostnames(): string[] {
    return Object.keys(APEX_TO_CANONICAL);
}

/**
 * Inline-скрипт в <head>: редирект до React/SW.
 * Критично для PWA, открытой с eastwestnh.com (без www).
 */
export function buildCanonicalRedirectScript(): string {
    const canonical = getCanonicalHostname();
    const apexHosts = getApexHostnames();
    if (!canonical || apexHosts.length === 0) return "";

    return `(function(){try{var c=${JSON.stringify(canonical)};var a=${JSON.stringify(apexHosts)};if(a.indexOf(location.hostname)!==-1){location.replace("https://"+c+location.pathname+location.search+location.hash);}}catch(e){}})();`;
}

/** Редирект на канонический хост (клиент). */
export function redirectToCanonicalHost(): boolean {
    if (typeof window === "undefined") return false;

    const canonicalHost = shouldRedirectToCanonicalHost(window.location.hostname);
    if (!canonicalHost) return false;

    const target = new URL(window.location.href);
    target.hostname = canonicalHost;
    target.protocol = "https:";
    window.location.replace(target.toString());
    return true;
}

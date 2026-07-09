/**
 * Same-origin check for state-changing requests (CSRF mitigation).
 * Browsers send Origin (or Referer) on cross-site form/fetch POSTs.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hostFromUrl(value: string): string | null {
    try {
        return new URL(value).host;
    } catch {
        return null;
    }
}

/**
 * Returns true when the request is same-origin or a safe method.
 * In production, missing Origin/Referer on mutating requests is rejected.
 * In development, missing headers are allowed (curl / Postman).
 */
export function isSameOriginRequest(request: Request): boolean {
    const method = request.method.toUpperCase();
    if (SAFE_METHODS.has(method)) return true;

    const host = request.headers.get("host");
    if (!host) return false;

    const origin = request.headers.get("origin");
    if (origin) {
        return hostFromUrl(origin) === host;
    }

    const referer = request.headers.get("referer");
    if (referer) {
        return hostFromUrl(referer) === host;
    }

    return process.env.NODE_ENV !== "production";
}

/** Paths that accept external callers (webhooks, NextAuth CSRF). */
export function isCsrfExemptApiPath(pathname: string): boolean {
    if (pathname.startsWith("/api/auth")) return true;
    if (pathname === "/api/telegram/webhook" || pathname.startsWith("/api/telegram/webhook/")) {
        return true;
    }
    return false;
}

export function sameOriginForbiddenResponse(): Response {
    return Response.json({ error: "Forbidden" }, { status: 403 });
}

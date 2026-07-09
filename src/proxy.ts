import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { verifyAdminSessionToken } from "@/lib/admin-session";
import {
    CANONICAL_HOSTNAME,
    isApexHost,
    isPwaAssetPath,
    shouldRedirectToCanonicalHost,
    shouldSkipCanonicalRedirect,
} from "@/lib/canonical-host";
import {
    buildCspHeaderValue,
    createCspNonce,
    CSP_NONCE_HEADER,
} from "@/lib/csp";
import {
    isCsrfExemptApiPath,
    isSameOriginRequest,
} from "@/lib/same-origin";

const handleI18nRouting = createIntlMiddleware(routing);
const isProd = process.env.NODE_ENV === "production";

function withNonceRequest(request: NextRequest, nonce: string): NextRequest {
    const headers = new Headers(request.headers);
    headers.set(CSP_NONCE_HEADER, nonce);
    return new NextRequest(request, { headers });
}

function applyCsp(response: NextResponse, nonce: string): NextResponse {
    // Production: enforce. Dev: Report-Only so Turbopack/HMR keep working.
    const headerName = isProd
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only";
    response.headers.set(headerName, buildCspHeaderValue(nonce));
    // Per-request nonce must not land in shared CDN caches (CVE-2026-44581).
    // `private` is enough; avoid `no-store` — it breaks bfcache and can leave
    // the tab spinner hanging on streamed RSC documents.
    if (isProd) {
        response.headers.set("Cache-Control", "private, no-cache");
    }
    return response;
}

async function handleAdminAuth(
    request: NextRequest,
    pathname: string,
): Promise<NextResponse> {
    const passThrough = () =>
        NextResponse.next({
            request: { headers: request.headers },
        });

    if (pathname.startsWith("/admin/login")) {
        return passThrough();
    }

    const cookieToken = request.cookies.get("admin_auth")?.value ?? "";
    if (cookieToken && (await verifyAdminSessionToken(cookieToken))) {
        if (pathname === "/admin" || pathname === "/admin/") {
            return NextResponse.redirect(new URL("/admin/orders", request.url));
        }
        return passThrough();
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const nonce = createCspNonce();
    const req = withNonceRequest(request, nonce);

    // SW и manifest должны отдаваться с текущего origin (apex или www) без 308.
    if (isPwaAssetPath(pathname)) {
        return applyCsp(NextResponse.next(), nonce);
    }

    if (!shouldSkipCanonicalRedirect(request.nextUrl.hostname)) {
        const canonicalHost = isApexHost(request.nextUrl.hostname)
            ? CANONICAL_HOSTNAME
            : shouldRedirectToCanonicalHost(request.nextUrl.hostname);
        if (canonicalHost) {
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.hostname = canonicalHost;
            redirectUrl.protocol = "https:";
            return NextResponse.redirect(redirectUrl, 308);
        }
    }

    if (pathname.startsWith("/api")) {
        // CSRF: reject cross-site state-changing calls (cookie-authenticated APIs).
        if (!isCsrfExemptApiPath(pathname) && !isSameOriginRequest(request)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.next();
    }

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/_vercel") ||
        // offline-fallback для SW живёт вне [locale]; i18n-роутинг делал
        // редирект на несуществующий /{locale}/offline → 404 → SW не ставился
        pathname === "/offline"
    ) {
        return applyCsp(NextResponse.next({
            request: { headers: req.headers },
        }), nonce);
    }

    if (pathname.startsWith("/admin")) {
        return applyCsp(await handleAdminAuth(req, pathname), nonce);
    }

    return applyCsp(handleI18nRouting(req), nonce);
}

export const config = {
    // sw.js и manifest.webmanifest явно в matcher - proxy пропускает их без редиректа.
    // Остальная статика с расширением (.png и т.д.) matcher не затрагивает.
    matcher: ["/sw.js", "/manifest.webmanifest", "/((?!_next|_vercel|.*\\..*).*)"],
};

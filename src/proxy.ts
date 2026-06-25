import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { verifyAdminSessionToken } from "@/lib/admin-session";
import { shouldRedirectToCanonicalHost } from "@/lib/canonical-host";

const handleI18nRouting = createIntlMiddleware(routing);

async function handleAdminAuth(
    request: NextRequest,
    pathname: string,
): Promise<NextResponse> {
    if (pathname.startsWith("/admin/login")) {
        return NextResponse.next();
    }

    const cookieToken = request.cookies.get("admin_auth")?.value ?? "";
    if (cookieToken && (await verifyAdminSessionToken(cookieToken))) {
        if (pathname === "/admin" || pathname === "/admin/") {
            return NextResponse.redirect(new URL("/admin/orders", request.url));
        }
        return NextResponse.next();
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const canonicalHost = shouldRedirectToCanonicalHost(request.nextUrl.hostname);
    if (canonicalHost) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.hostname = canonicalHost;
        redirectUrl.protocol = "https:";
        return NextResponse.redirect(redirectUrl, 308);
    }

    if (
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/_vercel")
    ) {
        return NextResponse.next();
    }

    if (pathname.startsWith("/admin")) {
        return handleAdminAuth(request, pathname);
    }

    return handleI18nRouting(request);
}

export const config = {
    // Включая /api и статику — apex должен уходить на www до SW и POST-запросов.
    matcher: ["/((?!_next|_vercel).*)"],
};

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { verifyAdminSessionToken } from "@/lib/admin-session";

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
    matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

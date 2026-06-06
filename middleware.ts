import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
    getAdminAuthCookieSettings,
    isAdminSessionConfigured,
    signAdminSessionToken,
    verifyAdminSessionToken,
} from "@/lib/admin-session";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function decodeTokenToBasicPayload(token: string): string {
    try {
        if (typeof globalThis.atob === "function") {
            return globalThis.atob(token);
        }
    } catch {
        // ignore
    }

    try {
        return Buffer.from(token, "base64").toString("utf-8");
    } catch {
        return "";
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/admin/login")) {
        return NextResponse.next();
    }

    if (!pathname.startsWith("/admin")) {
        return NextResponse.next();
    }

    if (!ADMIN_USER || !ADMIN_PASS) {
        return new NextResponse("Admin auth not configured", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
        });
    }

    if (!isAdminSessionConfigured()) {
        return new NextResponse("Admin session secret not configured", { status: 503 });
    }

    const cookieToken = request.cookies.get("admin_auth")?.value ?? "";
    if (cookieToken && (await verifyAdminSessionToken(cookieToken))) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get("authorization");
    const basicToken = authHeader?.startsWith("Basic ")
        ? authHeader.slice("Basic ".length).trim()
        : "";

    if (!basicToken) {
        const loginUrl = new URL("/admin/login", request.url);
        if (pathname !== "/admin/login") {
            loginUrl.searchParams.set("next", pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    const decoded = decodeTokenToBasicPayload(basicToken);
    const colon = decoded.indexOf(":");
    const user = colon === -1 ? "" : decoded.slice(0, colon);
    const pass = colon === -1 ? "" : decoded.slice(colon + 1);

    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
        return new NextResponse("Unauthorized", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
        });
    }

    const sessionToken = await signAdminSessionToken();
    if (!sessionToken) {
        return new NextResponse("Admin session signing not configured", {
            status: 503,
        });
    }

    const response = NextResponse.next();
    response.cookies.set("admin_auth", sessionToken, getAdminAuthCookieSettings());
    return response;
}

export const config = {
    matcher: ["/admin/:path*"],
};

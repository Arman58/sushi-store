import { NextRequest, NextResponse } from "next/server";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

function decodeToken(token: string): string {
    try {
        // Edge runtime
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const atobFn = (globalThis as any).atob;
        if (typeof atobFn === "function") {
            return atobFn(token);
        }
    } catch {
        // ignore
    }

    // Fallback for node dev
    try {
        return Buffer.from(token, "base64").toString("utf-8");
    } catch {
        return "";
    }
}

export function middleware(request: NextRequest) {
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

    // проверяем куку
    const cookieToken = request.cookies.get("admin_auth")?.value;
    const expected = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString("base64");

    if (cookieToken === expected) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] ?? "";

    if (!token) {
        return new NextResponse("Unauthorized", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
        });
    }

    const decoded = decodeToken(token);

    const [user, pass] = decoded.split(":");

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        const response = NextResponse.next();
        response.cookies.set("admin_auth", expected, {
            httpOnly: true,
            path: "/",
            sameSite: "lax",
        });
        return response;
    }

    return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
}

export const config = {
    matcher: ["/admin/:path*"],
};

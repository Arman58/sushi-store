import { NextResponse } from "next/server";

import {
    getAdminAuthCookieSettings,
    signAdminSessionToken,
} from "@/lib/admin-session";
import {
    checkRateLimit,
    rateLimitExceededPlainResponse,
} from "@/lib/rate-limit";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "adminLogin");
    if (!rateLimit.allowed) {
        return rateLimitExceededPlainResponse();
    }

    if (!ADMIN_USER || !ADMIN_PASS) {
        return new NextResponse("Admin auth is not configured", { status: 401 });
    }

    const formData = await request.formData();
    const user = (formData.get("user") as string) ?? "";
    const pass = (formData.get("pass") as string) ?? "";

    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = await signAdminSessionToken();
    if (!token) {
        return new NextResponse("ADMIN_SESSION_SECRET is not configured or too weak", {
            status: 503,
        });
    }

    const response = NextResponse.redirect(new URL("/admin/orders", request.url));
    response.cookies.set("admin_auth", token, getAdminAuthCookieSettings());

    return response;
}

import { NextResponse } from "next/server";

import {
    getAdminAuthCookieSettings,
    signAdminSessionToken,
} from "@/lib/admin-session";
import {
    checkRateLimit,
    rateLimitExceededPlainResponse,
} from "@/lib/rate-limit";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

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

    const userOk = timingSafeStringEqual(user, ADMIN_USER);
    const passOk = timingSafeStringEqual(pass, ADMIN_PASS);
    if (!userOk || !passOk) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = await signAdminSessionToken();
    if (!token) {
        return new NextResponse("ADMIN_SESSION_SECRET is not configured or too weak", {
            status: 503,
        });
    }

    // 303: браузер выполнит GET /admin/orders. Дефолтный 307 переотправил бы
    // POST (с креденшлами в теле) на page-роут.
    const response = NextResponse.redirect(
        new URL("/admin/orders", request.url),
        303,
    );
    response.cookies.set("admin_auth", token, getAdminAuthCookieSettings());

    return response;
}

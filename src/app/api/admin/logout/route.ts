import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
    getAdminAuthCookieSettings,
    revokeAdminSessionToken,
} from "@/lib/admin-session";

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_auth")?.value ?? "";
    if (token) {
        await revokeAdminSessionToken(token);
    }

    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    const settings = getAdminAuthCookieSettings();
    response.cookies.set("admin_auth", "", {
        ...settings,
        maxAge: 0,
    });
    return response;
}

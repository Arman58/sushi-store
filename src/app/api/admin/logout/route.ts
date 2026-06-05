import { NextResponse } from "next/server";

import { getAdminAuthCookieSettings } from "@/lib/admin-session";

export async function POST(request: Request) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    const settings = getAdminAuthCookieSettings();
    response.cookies.set("admin_auth", "", {
        ...settings,
        maxAge: 0,
    });
    return response;
}

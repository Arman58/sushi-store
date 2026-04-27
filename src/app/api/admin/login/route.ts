import { NextResponse } from "next/server";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

export async function POST(request: Request) {
    if (!ADMIN_USER || !ADMIN_PASS) {
        return new NextResponse("Admin auth is not configured", { status: 401 });
    }

    const formData = await request.formData();
    const user = (formData.get("user") as string) ?? "";
    const pass = (formData.get("pass") as string) ?? "";

    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = Buffer.from(`${user}:${pass}`).toString("base64");
    const response = NextResponse.redirect(new URL("/admin/orders", request.url));
    response.cookies.set("admin_auth", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    return response;
}

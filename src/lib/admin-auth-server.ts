import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyAdminSessionToken } from "@/lib/admin-session";

/** Проверка JWT в куке `admin_auth` (Server Components / layouts). */
export async function isAdminCookieAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_auth")?.value ?? "";
    if (!token) return false;
    return verifyAdminSessionToken(token);
}

/** Редирект на /admin/login, если сессии нет. */
export async function requireAdminSession(): Promise<void> {
    if (!(await isAdminCookieAuthenticated())) {
        redirect("/admin/login");
    }
}

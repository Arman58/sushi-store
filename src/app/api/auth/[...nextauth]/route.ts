import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";
import { normalizeEmail } from "@/lib/normalize-email";
import { checkRateLimit } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

const CREDENTIALS_CALLBACK_SUFFIX = "/callback/credentials";
const MAX_EMAIL_LENGTH = 254;

/**
 * Достаёт email из тела логина, не потребляя оригинальный body
 * (NextAuth читает его сам). Клиент шлёт urlencoded, но принимаем и JSON.
 */
async function readLoginEmail(request: Request): Promise<string | null> {
    try {
        const raw = await request.clone().text();
        const contentType = request.headers.get("content-type") ?? "";
        const value = contentType.includes("application/json")
            ? (JSON.parse(raw) as { email?: unknown }).email
            : new URLSearchParams(raw).get("email");
        if (typeof value !== "string" || value.length === 0) return null;
        const email = normalizeEmail(value.slice(0, MAX_EMAIL_LENGTH));
        return email || null;
    } catch {
        return null;
    }
}

/**
 * Ответ в формате, который ждёт `signIn(..., { redirect: false })` из next-auth/react:
 * JSON с `url`, у которого в query лежит `error`. Тогда клиент получает
 * `{ error: "TooManyRequests", status: 429 }`, а не падает на `new URL(undefined)`.
 */
function tooManyLoginAttemptsResponse(request: Request): Response {
    const origin = new URL(request.url).origin;
    return Response.json(
        { url: `${origin}/api/auth/signin?error=TooManyRequests` },
        { status: 429, headers: { "Retry-After": "900" } },
    );
}

export { handler as GET };

export async function POST(
    request: Request,
    context: { params: Promise<{ nextauth: string[] }> },
) {
    // Лимитируем только проверку пароля; signout/csrf/session не затрагиваем.
    if (new URL(request.url).pathname.endsWith(CREDENTIALS_CALLBACK_SUFFIX)) {
        // По IP: массовый перебор с одного адреса.
        const byIp = await checkRateLimit(request, "login");
        if (!byIp.allowed) return tooManyLoginAttemptsResponse(request);

        // По аккаунту: перебор одного пароля с множества IP.
        const email = await readLoginEmail(request);
        if (email) {
            const byEmail = await checkRateLimit(request, "loginEmail", `email:${email}`);
            if (!byEmail.allowed) return tooManyLoginAttemptsResponse(request);
        }
    }

    return handler(request, context);
}

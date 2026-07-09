import { NextResponse } from "next/server";

import { isAdminSessionConfigured, verifyAdminSessionToken } from "@/lib/admin-session";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

function readCookie(cookieHeader: string | null, name: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
        const trimmed = part.trim();
        if (!trimmed.startsWith(`${name}=`)) continue;
        return trimmed.slice(name.length + 1);
    }
    return null;
}

function decodeBasicCredentials(
    token: string,
): { user: string; pass: string } | null {
    try {
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        const colon = decoded.indexOf(":");
        if (colon === -1) return null;
        return {
            user: decoded.slice(0, colon),
            pass: decoded.slice(colon + 1),
        };
    } catch {
        return null;
    }
}

/**
 * Cookie `admin_auth`: подписанный JWT.
 * Basic Auth разрешён только вне production (локальные скрипты/API).
 */
export async function isAdminRequestAuthorized(request: Request): Promise<boolean> {
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    if (!adminUser || !adminPass || !isAdminSessionConfigured()) return false;

    const cookieToken = readCookie(request.headers.get("cookie"), "admin_auth");
    if (cookieToken && (await verifyAdminSessionToken(cookieToken))) {
        return true;
    }

    // Production: JWT cookie only — never accept Basic (credentials in every request).
    if (process.env.NODE_ENV === "production") {
        return false;
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Basic ")) {
        const token = authHeader.slice("Basic ".length).trim();
        const creds = decodeBasicCredentials(token);
        if (
            creds &&
            timingSafeStringEqual(creds.user, adminUser) &&
            timingSafeStringEqual(creds.pass, adminPass)
        ) {
            return true;
        }
    }

    return false;
}

export type VerifyAdminResult =
    | { ok: true }
    | { ok: false; response: NextResponse };

/**
 * Проверка админ-доступа для Route Handlers.
 * При отказе возвращайте `result.response` (401 JSON).
 */
export async function verifyAdmin(request: Request): Promise<VerifyAdminResult> {
    const rateLimit = await checkRateLimit(request, "adminApi");
    if (!rateLimit.allowed) {
        return { ok: false, response: rateLimitExceededJsonResponse() };
    }

    if (!(await isAdminRequestAuthorized(request))) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
    return { ok: true };
}

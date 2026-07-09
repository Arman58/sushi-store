import { randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { getUpstashRedis } from "@/lib/upstash-redis";

/** Согласовано с TTL JWT и Max-Age куки. */
const SESSION_MAX_AGE_SEC = 12 * 60 * 60;
const DENY_KEY_PREFIX = "admin:session:deny:";

const JWT_ALG = "HS256";

function getSecretKey(): Uint8Array | null {
    const secret = process.env.ADMIN_SESSION_SECRET?.trim();
    if (!secret || secret.length < 32) return null;
    return new TextEncoder().encode(secret);
}

export function isAdminSessionConfigured(): boolean {
    return getSecretKey() !== null;
}

export function getAdminAuthCookieMaxAgeSec(): number {
    return SESSION_MAX_AGE_SEC;
}

/** Параметры куки `admin_auth` (выставляется при POST /api/admin/login). */
export function getAdminAuthCookieSettings(): {
    httpOnly: true;
    secure: boolean;
    sameSite: "strict";
    path: string;
    maxAge: number;
} {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: SESSION_MAX_AGE_SEC,
    };
}

/** Подписанный JWT с jti для последующего revoke. */
export async function signAdminSessionToken(): Promise<string | null> {
    const key = getSecretKey();
    if (!key) return null;

    const jti = randomUUID();
    return new SignJWT({})
        .setProtectedHeader({ alg: JWT_ALG })
        .setSubject("admin")
        .setJti(jti)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
        .sign(key);
}

async function isSessionRevoked(jti: string): Promise<boolean> {
    if (!jti) return true;
    const redis = getUpstashRedis();
    if (!redis) {
        // Without Redis, revocation is best-effort (cookie clear only).
        return false;
    }
    try {
        const denied = await redis.get(`${DENY_KEY_PREFIX}${jti}`);
        return denied != null;
    } catch {
        // Fail open on Redis errors so admin panel stays usable.
        return false;
    }
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
    const key = getSecretKey();
    if (!key) return false;
    const trimmed = token.trim();
    if (!trimmed) return false;

    try {
        const { payload } = await jwtVerify(trimmed, key, { algorithms: [JWT_ALG] });
        if (payload.sub !== "admin") return false;
        const jti = typeof payload.jti === "string" ? payload.jti : "";
        if (!jti) return false;
        if (await isSessionRevoked(jti)) return false;
        return true;
    } catch {
        return false;
    }
}

/**
 * Revoke a session token (logout). Stores jti in Redis denylist until JWT expiry.
 * Safe no-op when Redis is unavailable or token is invalid.
 */
export async function revokeAdminSessionToken(token: string): Promise<void> {
    const key = getSecretKey();
    const redis = getUpstashRedis();
    if (!key || !redis) return;
    const trimmed = token.trim();
    if (!trimmed) return;

    try {
        const { payload } = await jwtVerify(trimmed, key, { algorithms: [JWT_ALG] });
        const jti = typeof payload.jti === "string" ? payload.jti : "";
        if (!jti) return;

        const exp = typeof payload.exp === "number" ? payload.exp : 0;
        const ttlSec = Math.max(1, exp - Math.floor(Date.now() / 1000));
        await redis.set(`${DENY_KEY_PREFIX}${jti}`, "1", { ex: ttlSec });
    } catch {
        // ignore invalid/expired tokens on logout
    }
}

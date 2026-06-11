import { jwtVerify,SignJWT } from "jose";

/** Согласовано с TTL JWT и Max-Age куки. */
const SESSION_MAX_AGE_SEC = 12 * 60 * 60;

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

/** Параметры куки `admin_auth` (login + proxy после Basic). */
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

/** Подписанный JWT без учётных данных в payload. */
export async function signAdminSessionToken(): Promise<string | null> {
    const key = getSecretKey();
    if (!key) return null;

    return new SignJWT({})
        .setProtectedHeader({ alg: JWT_ALG })
        .setSubject("admin")
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
        .sign(key);
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
    const key = getSecretKey();
    if (!key) return false;
    const trimmed = token.trim();
    if (!trimmed) return false;

    try {
        const { payload } = await jwtVerify(trimmed, key, { algorithms: [JWT_ALG] });
        return payload.sub === "admin";
    } catch {
        return false;
    }
}

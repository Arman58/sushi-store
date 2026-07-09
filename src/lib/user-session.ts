import { getUpstashRedis } from "@/lib/upstash-redis";

const DENY_KEY_PREFIX = "user:session:deny:";
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

/**
 * Revoke a NextAuth JWT by jti until natural expiry.
 * No-op without Redis (cookie clear still ends the browser session).
 */
export async function revokeUserSessionToken(
    jti: string,
    expUnixSec?: number,
): Promise<void> {
    const redis = getUpstashRedis();
    if (!redis || !jti) return;

    try {
        const ttlSec =
            typeof expUnixSec === "number"
                ? Math.max(1, expUnixSec - Math.floor(Date.now() / 1000))
                : SESSION_MAX_AGE_SEC;
        await redis.set(`${DENY_KEY_PREFIX}${jti}`, "1", { ex: ttlSec });
    } catch {
        // Fail open on Redis errors so logout still clears the cookie.
    }
}

export async function isUserSessionRevoked(jti: string): Promise<boolean> {
    if (!jti) return true;
    const redis = getUpstashRedis();
    if (!redis) return false;

    try {
        const denied = await redis.get(`${DENY_KEY_PREFIX}${jti}`);
        return denied != null;
    } catch {
        return false;
    }
}

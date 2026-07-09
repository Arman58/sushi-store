import { Redis } from "@upstash/redis";

let cached: Redis | null | undefined;

/** Shared Upstash client; null when env is not configured. */
export function getUpstashRedis(): Redis | null {
    if (cached !== undefined) return cached;

    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) {
        cached = null;
        return cached;
    }

    cached = new Redis({ url, token });
    return cached;
}

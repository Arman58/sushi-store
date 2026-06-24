import { randomInt } from "node:crypto";

import { Redis } from "@upstash/redis";

const OTP_TTL_SECONDS = 300;
const OTP_KEY_PREFIX = "otp:";

function createRedisClient(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) return null;
    return new Redis({ url, token });
}

const redis = createRedisClient();

/** Dev fallback when Upstash is not configured. */
const memoryStore = new Map<string, { code: string; expiresAt: number }>();

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function otpKey(email: string): string {
    return `${OTP_KEY_PREFIX}${normalizeEmail(email)}`;
}

export async function saveOtpCode(email: string, code: string): Promise<void> {
    const key = otpKey(email);

    if (redis) {
        await redis.set(key, code, { ex: OTP_TTL_SECONDS });
        return;
    }

    memoryStore.set(key, {
        code,
        expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });
}

export async function getOtpCode(email: string): Promise<string | null> {
    const key = otpKey(email);

    if (redis) {
        const value = await redis.get<string>(key);
        return typeof value === "string" ? value : null;
    }

    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        memoryStore.delete(key);
        return null;
    }
    return entry.code;
}

export async function deleteOtpCode(email: string): Promise<void> {
    const key = otpKey(email);

    if (redis) {
        await redis.del(key);
        return;
    }

    memoryStore.delete(key);
}

export function generateOtpCode(): string {
    return String(randomInt(1000, 10000));
}

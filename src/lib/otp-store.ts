import { randomInt } from "node:crypto";

import { Redis } from "@upstash/redis";

import { normalizeEmail } from "@/lib/normalize-email";

const OTP_TTL_SECONDS = 300;
const OTP_KEY_PREFIX = "otp:";
export const OTP_CODE_LENGTH = 6;
const OTP_CODE_PATTERN = new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`);

export { OTP_TTL_SECONDS };
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_RESEND_AVAILABLE_AT_SECONDS =
    OTP_TTL_SECONDS - OTP_RESEND_COOLDOWN_SECONDS;

function createRedisClient(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) return null;
    return new Redis({ url, token });
}

const redis = createRedisClient();

/** Dev-only fallback when Upstash is not configured. Never used in production. */
const memoryStore = new Map<string, { code: string; expiresAt: number }>();

function assertOtpStoreAvailable(): void {
    if (redis) return;
    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "OTP store unavailable: configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
        );
    }
}

export function otpRedisKey(email: string): string {
    return `${OTP_KEY_PREFIX}${normalizeEmail(email)}`;
}

export function isValidOtpCodeFormat(code: string): boolean {
    return OTP_CODE_PATTERN.test(code);
}

export async function saveOtpCode(email: string, code: string): Promise<void> {
    assertOtpStoreAvailable();
    const key = otpRedisKey(email);
    const storedCode = String(code).trim();

    if (redis) {
        await redis.set(key, storedCode, { ex: OTP_TTL_SECONDS });
        return;
    }

    memoryStore.set(key, {
        code: storedCode,
        expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });
}

export async function getOtpCode(email: string): Promise<string | null> {
    assertOtpStoreAvailable();
    const key = otpRedisKey(email);

    if (redis) {
        const value = await redis.get(key);
        if (value == null) return null;
        const code = String(value).trim();
        return isValidOtpCodeFormat(code) ? code : null;
    }

    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        memoryStore.delete(key);
        return null;
    }
    return String(entry.code).trim();
}

export async function deleteOtpCode(email: string): Promise<void> {
    assertOtpStoreAvailable();
    const key = otpRedisKey(email);

    if (redis) {
        await redis.del(key);
        return;
    }

    memoryStore.delete(key);
}

export function generateOtpCode(): string {
    const max = 10 ** OTP_CODE_LENGTH;
    const min = 10 ** (OTP_CODE_LENGTH - 1);
    return String(randomInt(min, max));
}

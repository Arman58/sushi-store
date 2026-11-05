import { randomInt } from "node:crypto";

import { normalizeEmail } from "@/lib/normalize-email";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";
import { getUpstashRedis } from "@/lib/upstash-redis";

const OTP_TTL_SECONDS = 300;
const OTP_KEY_PREFIX = "otp:";
export const OTP_CODE_LENGTH = 6;
const OTP_CODE_PATTERN = new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`);

export { OTP_TTL_SECONDS };
export const OTP_MAX_FAILED_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_RESEND_AVAILABLE_AT_SECONDS =
    OTP_TTL_SECONDS - OTP_RESEND_COOLDOWN_SECONDS;

export type OtpVerifyResult = "valid" | "expired" | "invalid";

type MemoryOtp = {
    code: string | null;
    failedAttempts: number;
    expiresAt: number;
};

/** Dev-only fallback when Upstash is not configured. Never used in production. */
const memoryStore = new Map<string, MemoryOtp>();
const memoryCooldowns = new Map<string, number>();

function otpRedis() {
    const redis = getUpstashRedis();
    if (!redis && process.env.NODE_ENV === "production") {
        throw new Error(
            "OTP store unavailable: configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
        );
    }
    return redis;
}

export function otpRedisKey(email: string): string {
    return `${OTP_KEY_PREFIX}${normalizeEmail(email)}`;
}

function attemptsKey(email: string): string {
    return `${otpRedisKey(email)}:attempts`;
}

function getMemoryOtp(key: string): MemoryOtp | null {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
        memoryStore.delete(key);
        return null;
    }
    return entry;
}

export function isValidOtpCodeFormat(code: string): boolean {
    return OTP_CODE_PATTERN.test(code);
}

export async function saveOtpCode(email: string, code: string): Promise<void> {
    const redis = otpRedis();
    const key = otpRedisKey(email);
    const storedCode = String(code).trim();

    if (redis) {
        // Replacing the code and resetting its attempt budget must be atomic.
        await redis.multi()
            .set(key, storedCode, { ex: OTP_TTL_SECONDS })
            .del(attemptsKey(email))
            .exec();
        return;
    }

    memoryStore.set(key, {
        code: storedCode,
        failedAttempts: 0,
        expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });
}

export async function getOtpCode(email: string): Promise<string | null> {
    const redis = otpRedis();
    const key = otpRedisKey(email);

    if (redis) {
        const value = await redis.get(key);
        if (value == null) return null;
        const code = String(value).trim();
        return isValidOtpCodeFormat(code) ? code : null;
    }

    return getMemoryOtp(key)?.code ?? null;
}

export async function deleteOtpCode(email: string): Promise<void> {
    const redis = otpRedis();
    const key = otpRedisKey(email);

    if (redis) {
        await redis.del(key, attemptsKey(email));
        return;
    }

    memoryStore.delete(key);
}

// Check, count and consume in one operation: concurrent requests cannot bypass
// the attempt budget, reuse a successful code or delete a newly issued code.
const VERIFY_OTP_SCRIPT = `
local attempts = tonumber(redis.call("GET", KEYS[2]) or "0")
if attempts >= tonumber(ARGV[2]) then return "invalid" end
local code = redis.call("GET", KEYS[1])
if not code then return "expired" end
local ttl = redis.call("PTTL", KEYS[1])
if ttl <= 0 then return "expired" end
local matches = string.len(code) == string.len(ARGV[1])
local difference = 0
if matches then
    for i = 1, string.len(code) do
        difference = bit.bor(difference, bit.bxor(string.byte(code, i), string.byte(ARGV[1], i)))
    end
end
if matches and difference == 0 then
    redis.call("DEL", KEYS[1], KEYS[2])
    return "valid"
end
attempts = attempts + 1
redis.call("SET", KEYS[2], attempts, "PX", ttl)
if attempts >= tonumber(ARGV[2]) then redis.call("DEL", KEYS[1]) end
return "invalid"
`;

export async function consumeOtpCode(email: string, code: string): Promise<OtpVerifyResult> {
    const redis = otpRedis();
    const key = otpRedisKey(email);

    if (redis) {
        return redis.eval<[string, number], OtpVerifyResult>(
            VERIFY_OTP_SCRIPT,
            [key, attemptsKey(email)],
            [code, OTP_MAX_FAILED_ATTEMPTS],
        );
    }

    const entry = getMemoryOtp(key);
    if (!entry) return "expired";
    if (entry.failedAttempts >= OTP_MAX_FAILED_ATTEMPTS) return "invalid";
    if (entry.code && timingSafeStringEqual(entry.code, code)) {
        memoryStore.delete(key);
        return "valid";
    }
    entry.failedAttempts += 1;
    if (entry.failedAttempts >= OTP_MAX_FAILED_ATTEMPTS) entry.code = null;
    return "invalid";
}

/** Reserve before generating/sending; shared by every OTP issuance endpoint. */
export async function claimOtpResendCooldown(email: string): Promise<boolean> {
    const redis = otpRedis();
    const key = `${otpRedisKey(email)}:cooldown`;
    if (redis) {
        const result = await redis.set(key, "1", {
            nx: true,
            ex: OTP_RESEND_COOLDOWN_SECONDS,
        });
        return result === "OK";
    }

    const now = Date.now();
    if ((memoryCooldowns.get(key) ?? 0) > now) return false;
    if (memoryCooldowns.size > 10_000) {
        for (const [emailKey, expiresAt] of memoryCooldowns) {
            if (expiresAt <= now) memoryCooldowns.delete(emailKey);
        }
    }
    memoryCooldowns.set(key, now + OTP_RESEND_COOLDOWN_SECONDS * 1000);
    return true;
}

export function generateOtpCode(): string {
    const max = 10 ** OTP_CODE_LENGTH;
    const min = 10 ** (OTP_CODE_LENGTH - 1);
    return String(randomInt(min, max));
}

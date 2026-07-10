import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/** Расширяемый набор лимитов - добавляйте bucket + config при новых endpoint-ах. */
export type RateLimitBucket =
    | "order"
    | "adminLogin"
    | "adminApi"
    | "register"
    | "verifyOtp"
    | "resendOtp"
    | "validateCart"
    | "validatePromo"
    | "orderStatus"
    | "search"
    | "reviewHelpful"
    | "pushSubscribe";

type BucketConfig = {
    requests: number;
    window: `${number} s` | `${number} m` | `${number} h`;
    prefix: string;
    /**
     * Auth-класс: при недоступном Redis запрос ОТКЛОНЯЕТСЯ (fail-closed).
     * Иначе сбой Upstash открывает брутфорс логина/OTP. Для revenue-путей
     * (order, search и т.д.) остаётся fail-open, чтобы не терять заказы.
     */
    failClosed?: boolean;
};

export const RATE_LIMIT_BUCKETS: Record<RateLimitBucket, BucketConfig> = {
    order: { requests: 5, window: "60 s", prefix: "rl:order" },
    adminLogin: { requests: 5, window: "15 m", prefix: "rl:admin-login", failClosed: true },
    adminApi: { requests: 100, window: "60 s", prefix: "rl:admin-api" },
    register: { requests: 5, window: "15 m", prefix: "rl:register", failClosed: true },
    verifyOtp: { requests: 10, window: "15 m", prefix: "rl:verify-otp", failClosed: true },
    resendOtp: { requests: 5, window: "15 m", prefix: "rl:resend-otp", failClosed: true },
    validateCart: { requests: 20, window: "60 s", prefix: "rl:validate-cart" },
    validatePromo: { requests: 10, window: "60 s", prefix: "rl:validate-promo" },
    orderStatus: { requests: 10, window: "60 s", prefix: "rl:order-status" },
    search: { requests: 30, window: "60 s", prefix: "rl:search" },
    reviewHelpful: { requests: 20, window: "60 s", prefix: "rl:review-helpful" },
    pushSubscribe: { requests: 10, window: "60 s", prefix: "rl:push-subscribe" },
};

const isProduction = process.env.NODE_ENV === "production";

function createRedisClient(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) return null;
    return new Redis({ url, token });
}

const redis = createRedisClient();

function createLimiter(bucket: RateLimitBucket): Ratelimit | null {
    if (!redis) return null;
    const cfg = RATE_LIMIT_BUCKETS[bucket];
    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window),
        prefix: cfg.prefix,
    });
}

const limiters: Record<RateLimitBucket, Ratelimit | null> = {
    order: createLimiter("order"),
    adminLogin: createLimiter("adminLogin"),
    adminApi: createLimiter("adminApi"),
    register: createLimiter("register"),
    verifyOtp: createLimiter("verifyOtp"),
    resendOtp: createLimiter("resendOtp"),
    validateCart: createLimiter("validateCart"),
    validatePromo: createLimiter("validatePromo"),
    orderStatus: createLimiter("orderStatus"),
    search: createLimiter("search"),
    reviewHelpful: createLimiter("reviewHelpful"),
    pushSubscribe: createLimiter("pushSubscribe"),
};

export function isUpstashRateLimitConfigured(): boolean {
    return redis !== null;
}

/**
 * In-memory fallback для failClosed-бакетов, когда Upstash недоступен.
 * Пер-инстанс (serverless: нестрого), но радикально лучше, чем fail-open
 * для брутфорса логина. Fixed window по конфигу бакета.
 */
const memoryHits = new Map<string, { count: number; resetAt: number }>();

function parseWindowMs(window: BucketConfig["window"]): number {
    const [num, unit] = window.split(" ");
    const n = Number(num);
    if (unit === "s") return n * 1000;
    if (unit === "m") return n * 60_000;
    return n * 3_600_000;
}

function checkMemoryLimit(bucket: RateLimitBucket, ip: string): boolean {
    const cfg = RATE_LIMIT_BUCKETS[bucket];
    const key = `${cfg.prefix}:${ip}`;
    const now = Date.now();
    const entry = memoryHits.get(key);

    if (!entry || now >= entry.resetAt) {
        // Попутная уборка, чтобы Map не рос бесконечно.
        if (memoryHits.size > 10_000) {
            for (const [k, v] of memoryHits) {
                if (now >= v.resetAt) memoryHits.delete(k);
            }
        }
        memoryHits.set(key, { count: 1, resetAt: now + parseWindowMs(cfg.window) });
        return true;
    }

    entry.count += 1;
    return entry.count <= cfg.requests;
}

export function getClientIp(request: Request): string {
    // x-real-ip выставляется платформой (Vercel/nginx) и не подделывается
    // клиентом, в отличие от левого значения x-forwarded-for, которое за
    // сторонним прокси позволяет бесконечно менять identity лимитера.
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();

    const requestIp = (request as Request & { ip?: string }).ip;
    if (requestIp) return requestIp;

    return "unknown";
}

export type RateLimitOutcome =
    | { allowed: true }
    | { allowed: false; reason: "limited" | "unavailable" };

/**
 * Проверяет и учитывает попытку (sliding window).
 * Без Upstash / при сбое Upstash:
 * - failClosed-бакеты (login/OTP/register) → in-memory fallback-лимитер,
 *   чтобы сбой Redis не открывал брутфорс;
 * - остальные (revenue-пути) → fail-open, чтобы не терять заказы.
 */
export async function checkRateLimit(
    request: Request,
    bucket: RateLimitBucket,
): Promise<RateLimitOutcome> {
    const limiter = limiters[bucket];
    const failClosed = RATE_LIMIT_BUCKETS[bucket].failClosed === true;

    if (!limiter) {
        if (failClosed) {
            const ok = checkMemoryLimit(bucket, getClientIp(request));
            return ok
                ? { allowed: true }
                : { allowed: false, reason: "limited" };
        }
        if (isProduction) {
            console.error(
                `[rate-limit] Upstash Redis is not configured; failing open in production to prevent revenue loss (bucket=${bucket})`,
            );
        }
        return { allowed: true };
    }

    try {
        const ip = getClientIp(request);
        const { success } = await limiter.limit(ip);
        if (!success) {
            return { allowed: false, reason: "limited" };
        }
        return { allowed: true };
    } catch (error) {
        if (failClosed) {
            console.error(
                `[rate-limit] Upstash request failed; using in-memory fallback for auth bucket (bucket=${bucket})`,
                error,
            );
            const ok = checkMemoryLimit(bucket, getClientIp(request));
            return ok
                ? { allowed: true }
                : { allowed: false, reason: "unavailable" };
        }
        if (isProduction) {
            console.error(
                `[rate-limit] Upstash request failed; failing open in production to prevent revenue loss (bucket=${bucket})`,
                error,
            );
            return { allowed: true };
        }
        console.warn(
            `[rate-limit] Upstash request failed; failing open in development (bucket=${bucket})`,
            error,
        );
        return { allowed: true };
    }
}

/** Непрозрачный 429 - не раскрываем limited vs unavailable. */
export function rateLimitExceededJsonResponse(): NextResponse {
    return NextResponse.json(
        { error: "Too many requests" },
        {
            status: 429,
            headers: { "Retry-After": "60" },
        },
    );
}

/** Для proxy / plain-text admin login. */
export function rateLimitExceededPlainResponse(): NextResponse {
    return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
    });
}

/** @deprecated Используйте checkRateLimit(request, "order"). */
export async function isOrderRateLimited(request: Request): Promise<boolean> {
    const outcome = await checkRateLimit(request, "order");
    return !outcome.allowed;
}

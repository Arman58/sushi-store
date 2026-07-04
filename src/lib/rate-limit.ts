import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/** Расширяемый набор лимитов — добавляйте bucket + config при новых endpoint-ах. */
export type RateLimitBucket =
    | "order"
    | "adminLogin"
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
};

export const RATE_LIMIT_BUCKETS: Record<RateLimitBucket, BucketConfig> = {
    order: { requests: 5, window: "60 s", prefix: "rl:order" },
    adminLogin: { requests: 5, window: "15 m", prefix: "rl:admin-login" },
    register: { requests: 5, window: "15 m", prefix: "rl:register" },
    verifyOtp: { requests: 10, window: "15 m", prefix: "rl:verify-otp" },
    resendOtp: { requests: 5, window: "15 m", prefix: "rl:resend-otp" },
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

export function getClientIp(request: Request): string {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();

    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    const requestIp = (request as Request & { ip?: string }).ip;
    if (requestIp) return requestIp;

    return "unknown";
}

export type RateLimitOutcome =
    | { allowed: true }
    | { allowed: false; reason: "limited" | "unavailable" };

/**
 * Проверяет и учитывает попытку (sliding window).
 * Production без Upstash → fail-closed (unavailable).
 * Development без Upstash → fail-open.
 */
export async function checkRateLimit(
    request: Request,
    bucket: RateLimitBucket,
): Promise<RateLimitOutcome> {
    const limiter = limiters[bucket];

    if (!limiter) {
        if (isProduction) {
            console.error(
                `[rate-limit] Upstash Redis is not configured; failing closed (bucket=${bucket})`,
            );
            return { allowed: false, reason: "unavailable" };
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
        if (isProduction) {
            console.error(
                `[rate-limit] Upstash request failed; failing closed (bucket=${bucket})`,
                error,
            );
            return { allowed: false, reason: "unavailable" };
        }
        console.warn(
            `[rate-limit] Upstash request failed; failing open in development (bucket=${bucket})`,
            error,
        );
        return { allowed: true };
    }
}

/** Непрозрачный 429 — не раскрываем limited vs unavailable. */
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

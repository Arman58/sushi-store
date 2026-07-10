import { randomBytes } from "node:crypto";

const isProd = process.env.NODE_ENV === "production";

/** CSP nonce: 128 bits, base64 (W3C CSP guidance). */
export function createCspNonce(): string {
    return randomBytes(16).toString("base64");
}

/**
 * Build Content-Security-Policy value.
 * - Production: enforce-ready (caller sets header name).
 * - Dev: allows 'unsafe-eval' for Turbopack/HMR.
 *
 * Styles: 'unsafe-inline' without nonce on style-src-elem. A nonce in the
 * same directive disables 'unsafe-inline' (CSP spec), which blocks Vercel Live
 * and other third-party <style> tags. XSS mitigation stays on script-src nonce.
 * style-src-attr stays unsafe-inline for dynamic style attributes.
 */
export function buildCspHeaderValue(nonce: string): string {
    const scriptSrc = isProd
        ? `script-src 'self' 'nonce-${nonce}' https://vercel.live https://va.vercel-scripts.com`
        : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com`;

    return [
        "default-src 'self'",
        scriptSrc,
        "style-src-elem 'self' 'unsafe-inline' https://vercel.live",
        "style-src-attr 'unsafe-inline'",
        // Fallback for older browsers that ignore style-src-elem/attr.
        "style-src 'self' 'unsafe-inline' https://vercel.live",
        "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://placehold.co https://vercel.live https://vercel.com",
        "font-src 'self' data: https://vercel.live https://assets.vercel.com",
        "connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io https://vercel.live wss://ws-us3.pusher.com https://va.vercel-scripts.com",
        "frame-src 'self' https://vercel.live",
        "worker-src 'self' blob:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
}

export const CSP_NONCE_HEADER = "x-nonce";

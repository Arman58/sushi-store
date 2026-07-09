import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison to reduce timing-attack leakage.
 * Different lengths still return false after a dummy compare.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
        timingSafeEqual(aBuf, aBuf);
        return false;
    }
    return timingSafeEqual(aBuf, bBuf);
}

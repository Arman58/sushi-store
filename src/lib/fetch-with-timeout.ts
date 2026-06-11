export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
export const NOTIFICATION_FETCH_TIMEOUT_MS = 5_000;

/**
 * fetch с AbortController - сторонние API (Telegram, Resend HTTP и т.д.)
 * не могут висеть дольше timeoutMs.
 */
export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Promise.race для SDK-вызовов без fetch (Resend, Cloudinary upload_stream). */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label = "operation",
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
            () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
            timeoutMs,
        );
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const NETWORK_ERROR_PATTERNS = [
    /network request failed/i,
    /failed to fetch/i,
    /load failed/i,
    /networkerror/i,
    /network error/i,
    /fetch failed/i,
    /the internet connection appears to be offline/i,
    /network connection was lost/i,
];

const EXTENSION_URL_PATTERNS = [
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /safari-extension:\/\//i,
    /extensions\//i,
];

const BOT_USER_AGENT_PATTERN = /bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit/i;

export const SENTRY_IGNORE_ERRORS = [
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    "NetworkError when attempting to fetch resource.",
    "Network request failed",
    "cancelled",
];

export const SENTRY_DENY_URLS = [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
];

function getErrorMessage(hint?: EventHint): string {
    const original = hint?.originalException;
    if (original instanceof Error) {
        return original.message;
    }
    if (typeof original === "string") {
        return original;
    }
    return "";
}

function stackContainsExtension(event: ErrorEvent, hint?: EventHint): boolean {
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
    if (
        frames.some((frame) =>
            EXTENSION_URL_PATTERNS.some((pattern) => pattern.test(frame.filename ?? "")),
        )
    ) {
        return true;
    }

    const stack =
        hint?.originalException instanceof Error ? hint.originalException.stack : "";
    return EXTENSION_URL_PATTERNS.some((pattern) => pattern.test(stack ?? ""));
}

function isBotRequest(event: ErrorEvent): boolean {
    const headers = event.request?.headers;
    const userAgent =
        headers?.["User-Agent"] ??
        headers?.["user-agent"] ??
        (typeof navigator !== "undefined" ? navigator.userAgent : undefined);

    return Boolean(userAgent && BOT_USER_AGENT_PATTERN.test(userAgent));
}

function isNetworkError(message: string): boolean {
    return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function sentryBeforeSend(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
    const exceptionMessage = event.exception?.values?.[0]?.value ?? "";
    const message = exceptionMessage || event.message || getErrorMessage(hint);

    if (message && isNetworkError(message)) {
        return null;
    }

    if (stackContainsExtension(event, hint)) {
        return null;
    }

    if (isBotRequest(event)) {
        return null;
    }

    return event;
}

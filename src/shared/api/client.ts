/**
 * Typed fetch wrapper used across all API calls.
 * Centralises error handling, JSON parsing, and Content-Type headers.
 */

import { type AppLocale, routing } from "@/i18n/routing";
import {
    API_ERROR_CODES,
    type ApiErrorCode,
    extractApiErrorCode,
} from "@/shared/lib/api-error";

function resolveClientLocale(): AppLocale {
    if (typeof window === "undefined") return routing.defaultLocale;
    const match = window.location.pathname.match(/^\/(hy|en|ru)(?=\/|$)/);
    return (match?.[1] as AppLocale | undefined) ?? routing.defaultLocale;
}

async function getSessionExpiredToastMessage(): Promise<string> {
    const locale = resolveClientLocale();
    const messages = (await import(`@/messages/${locale}.json`)).default as {
        common: { toast: { sessionExpired: string } };
    };
    return messages.common.toast.sessionExpired;
}

let unauthorizedHandling: Promise<void> | null = null;

async function handleUnauthorized(): Promise<void> {
    if (typeof window === "undefined") return;

    if (!unauthorizedHandling) {
        unauthorizedHandling = (async () => {
            const [{ signOut }, { showAppToast }] = await Promise.all([
                import("next-auth/react"),
                import("@/shared/lib/show-app-toast"),
            ]);
            await signOut({ redirect: false });
            showAppToast(await getSessionExpiredToastMessage(), "error");
        })().finally(() => {
            unauthorizedHandling = null;
        });
    }

    await unauthorizedHandling;
}

export class ApiError extends Error {
    readonly data: unknown;
    readonly code: ApiErrorCode | undefined;

    constructor(
        public readonly status: number,
        message: string,
        data?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
        this.data = data ?? { error: message, status };
        this.code = extractApiErrorCode(data ?? { error: message, status });
    }
}

function extractErrorMessage(body: unknown, status: number): string {
    if (typeof body === "object" && body !== null) {
        const record = body as Record<string, unknown>;
        for (const key of ["error", "message", "detail", "details"]) {
            const value = record[key];
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }
    }

    if (typeof body === "string" && body.trim()) {
        return body.trim().slice(0, 300);
    }

    if (status >= 500) {
        return "Internal server error";
    }

    return `HTTP ${status}`;
}

function normalizeErrorData(body: unknown, status: number, message: string): Record<string, unknown> {
    const base: Record<string, unknown> =
        typeof body === "object" && body !== null
            ? { ...(body as Record<string, unknown>) }
            : { raw: body };

    if (!extractApiErrorCode(base) && status >= 500) {
        base.error = message;
        base.code = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
    }

    return base;
}

async function parseResponse<T>(res: Response): Promise<T> {
    const rawText = await res.text();
    let body: unknown = rawText;

    if (rawText) {
        try {
            body = JSON.parse(rawText) as unknown;
        } catch {
            body = rawText;
        }
    }

    if (!res.ok) {
        const message = extractErrorMessage(body, res.status);
        const errorData = normalizeErrorData(body, res.status, message);

        if (res.status === 401) {
            void handleUnauthorized();
        }

        throw new ApiError(res.status, message, errorData);
    }

    return body as T;
}

export async function apiGet<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store" });
    return parseResponse<T>(res);
}

export async function apiPost<TBody, TResponse>(
    url: string,
    body: TBody,
): Promise<TResponse> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return parseResponse<TResponse>(res);
}

/**
 * Typed fetch wrapper used across all API calls.
 * Centralises error handling, JSON parsing, and Content-Type headers.
 */

export class ApiError extends Error {
    readonly data: unknown;

    constructor(
        public readonly status: number,
        message: string,
        data?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
        this.data = data ?? { error: message, status };
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
        return `Внутренняя ошибка сервера (${status})`;
    }

    return `HTTP ${status}`;
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
        const errorData =
            typeof body === "object" && body !== null
                ? body
                : { error: message, status: res.status, raw: rawText || null };
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

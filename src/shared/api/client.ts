/**
 * Typed fetch wrapper used across all API calls.
 * Centralises error handling, JSON parsing, and Content-Type headers.
 */

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

async function parseResponse<T>(res: Response): Promise<T> {
    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        const message =
            isJson && typeof body === "object" && body !== null && "error" in body
                ? String((body as Record<string, unknown>).error)
                : `HTTP ${res.status}`;
        throw new ApiError(res.status, message);
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

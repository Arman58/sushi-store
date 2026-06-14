import { NextResponse } from "next/server";

/** Machine-readable коды ошибок API — клиент не парсит текст message. */
export const API_ERROR_CODES = {
    PRICE_MISMATCH: "PRICE_MISMATCH",
    ITEM_UNAVAILABLE: "ITEM_UNAVAILABLE",
    REQUIRED_MODIFIER_MISSING: "REQUIRED_MODIFIER_MISSING",
    MODIFIER_LIMIT_EXCEEDED: "MODIFIER_LIMIT_EXCEEDED",
    INVALID_CART_PAYLOAD: "INVALID_CART_PAYLOAD",
    SUBTOTAL_MISMATCH: "SUBTOTAL_MISMATCH",
    DISCOUNT_MISMATCH: "DISCOUNT_MISMATCH",
    TOTAL_MISMATCH: "TOTAL_MISMATCH",
    PROMO_UNAVAILABLE: "PROMO_UNAVAILABLE",
    ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Структурированное тело ошибки для JSON-ответов. */
export type ApiErrorBody = {
    error: string;
    code: ApiErrorCode;
};

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
    if (typeof value !== "object" || value === null) return false;
    const record = value as Record<string, unknown>;
    return (
        typeof record.error === "string" &&
        typeof record.code === "string" &&
        Object.values(API_ERROR_CODES).includes(record.code as ApiErrorCode)
    );
}

export function extractApiErrorCode(data: unknown): ApiErrorCode | undefined {
    if (isApiErrorBody(data)) return data.code;
    if (typeof data === "object" && data !== null) {
        const code = (data as Record<string, unknown>).code;
        if (
            typeof code === "string" &&
            Object.values(API_ERROR_CODES).includes(code as ApiErrorCode)
        ) {
            return code as ApiErrorCode;
        }
    }
    return undefined;
}

export function apiErrorJsonResponse(
    code: ApiErrorCode,
    message: string,
    status: number,
): NextResponse<ApiErrorBody> {
    return NextResponse.json({ error: message, code }, { status });
}

import { NextResponse } from "next/server";
import type { ZodType } from "zod";

type ParseJsonBodyResult<T> =
    | { ok: true; data: T }
    | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(
    request: Request,
    schema: ZodType<T>,
): Promise<ParseJsonBodyResult<T>> {
    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
        };
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        const message = first?.message ?? "Invalid payload";
        return {
            ok: false,
            response: NextResponse.json({ error: message }, { status: 400 }),
        };
    }

    return { ok: true, data: parsed.data };
}

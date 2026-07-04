import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
    getFormValidationMessage,
    resolveOrderRequestLocale,
} from "@/lib/backend-i18n";
import { issueOtpForEmail } from "@/lib/otp-auth";
import { prisma } from "@/lib/prisma";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";

const bodySchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "form.email.required")
        .email("form.email.invalid")
        .transform((v) => v.toLowerCase()),
    locale: z.enum(["hy", "ru", "en"]).optional(),
});

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "resendOtp");
    if (!rateLimit.allowed) {
        return rateLimitExceededJsonResponse();
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;

    let json: unknown = null;
    try {
        json = await request.json();
    } catch {
        // локаль всё равно вытащим из заголовков ниже
    }
    const rawLocale =
        json && typeof json === "object" && "locale" in json
            ? (json as { locale?: unknown }).locale
            : undefined;
    const locale = resolveOrderRequestLocale(
        request,
        typeof rawLocale === "string" ? rawLocale : null,
    );

    if (!userId) {
        return NextResponse.json(
            { error: getFormValidationMessage("form.auth.loginRequired", locale) },
            { status: 401 },
        );
    }

    if (json == null) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        const key = parsed.error.errors[0]?.message ?? "form.generic";
        return NextResponse.json(
            { error: getFormValidationMessage(key, locale) },
            { status: 400 },
        );
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailVerified: true },
    });

    if (!user?.email) {
        return NextResponse.json(
            { error: getFormValidationMessage("form.auth.userNotFound", locale) },
            { status: 404 },
        );
    }

    if (user.email.toLowerCase() !== email) {
        return NextResponse.json(
            { error: getFormValidationMessage("form.email.mismatch", locale) },
            { status: 403 },
        );
    }

    if (user.emailVerified != null) {
        return NextResponse.json(
            { error: getFormValidationMessage("form.auth.emailAlreadyVerified", locale) },
            { status: 400 },
        );
    }

    const { sent } = await issueOtpForEmail(email, parsed.data.locale);
    if (!sent) {
        return NextResponse.json(
            { error: getFormValidationMessage("form.auth.emailSendFailed", locale) },
            { status: 502 },
        );
    }

    return NextResponse.json({ status: "OTP_SENT" });
}

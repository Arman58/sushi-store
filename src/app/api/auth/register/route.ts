import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
    getFormValidationMessage,
    resolveOrderRequestLocale,
} from "@/lib/backend-i18n";
import { normalizeEmail } from "@/lib/normalize-email";
import { issueOtpForEmail } from "@/lib/otp-auth";
import { prisma } from "@/lib/prisma";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";
import { GENERIC_REGISTRATION_FAILURE_MESSAGE } from "@/lib/register-auth";

const BCRYPT_ROUNDS = 10;

const registerSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "form.email.required")
        .email("form.email.invalid")
        .transform((v) => v.toLowerCase()),
    password: z
        .string()
        .min(8, "form.password.tooShort"),
    name: z
        .string()
        .trim()
        .min(2, "form.name.tooShort"),
    locale: z.enum(["hy", "ru", "en"]).optional(),
});

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "register");
    if (!rateLimit.allowed) {
        return rateLimitExceededJsonResponse();
    }

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
        const rawLocale =
            json && typeof json === "object" && "locale" in json
                ? (json as { locale?: unknown }).locale
                : undefined;
        const locale = resolveOrderRequestLocale(
            request,
            typeof rawLocale === "string" ? rawLocale : null,
        );
        const key = parsed.error.errors[0]?.message ?? "form.generic";
        return NextResponse.json(
            { error: getFormValidationMessage(key, locale) },
            { status: 400 },
        );
    }

    const { email, password, name, locale } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
        return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
        await prisma.user.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                name,
                emailVerified: null,
                phone: null,
                image: null,
            },
        });
    } catch {
        return NextResponse.json(
            { error: GENERIC_REGISTRATION_FAILURE_MESSAGE },
            { status: 400 },
        );
    }

    await issueOtpForEmail(normalizedEmail, locale);

    return NextResponse.json({ status: "OTP_SENT" }, { status: 200 });
}

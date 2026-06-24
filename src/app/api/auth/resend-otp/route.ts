import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeEmail } from "@/lib/normalize-email";
import { issueOtpForEmail } from "@/lib/otp-auth";
import { prisma } from "@/lib/prisma";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";

const resendOtpSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1)
        .email()
        .transform((v) => v.toLowerCase()),
    locale: z.enum(["hy", "ru", "en"]).optional(),
});

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "resendOtp");
    if (!rateLimit.allowed) {
        return rateLimitExceededJsonResponse();
    }

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = resendOtpSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ status: "OTP_SENT" }, { status: 200 });
    }

    const { email, locale } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { emailVerified: true },
    });

    if (user && user.emailVerified == null) {
        await issueOtpForEmail(normalizedEmail, locale);
    }

    return NextResponse.json({ status: "OTP_SENT" }, { status: 200 });
}

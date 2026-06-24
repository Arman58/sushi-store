import { NextResponse } from "next/server";
import { z } from "zod";

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

    const user = await prisma.user.findUnique({
        where: { email },
        select: { emailVerified: true },
    });

    if (user && user.emailVerified == null) {
        void issueOtpForEmail(email, locale);
    }

    return NextResponse.json({ status: "OTP_SENT" }, { status: 200 });
}

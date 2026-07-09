import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeEmail } from "@/lib/normalize-email";
import { verifyOtpCode } from "@/lib/otp-auth";
import { prisma } from "@/lib/prisma";
import {
    checkRateLimit,
    rateLimitExceededJsonResponse,
} from "@/lib/rate-limit";

const verifyOtpSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1)
        .email()
        .transform((v) => v.toLowerCase()),
    code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "Invalid code"),
});

export async function POST(request: Request) {
    const rateLimit = await checkRateLimit(request, "verifyOtp");
    if (!rateLimit.allowed) {
        return rateLimitExceededJsonResponse();
    }

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = verifyOtpSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, code } = parsed.data;
    const normalizedEmail = normalizeEmail(email);
    const cleanCode = String(code).trim();

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, emailVerified: true },
    });

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.emailVerified) {
        return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const result = await verifyOtpCode(normalizedEmail, cleanCode);
    if (result === "expired") {
        return NextResponse.json({ error: "OTP_EXPIRED" }, { status: 410 });
    }
    if (result === "invalid") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
    });

    return NextResponse.json({ ok: true });
}

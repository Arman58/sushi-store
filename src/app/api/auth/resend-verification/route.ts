import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Укажите email")
        .email("Некорректный email")
        .transform((v) => v.toLowerCase()),
});

export async function POST(request: Request) {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (!userId) {
        return NextResponse.json({ error: "Необходимо войти в аккаунт" }, { status: 401 });
    }

    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        const message = parsed.error.errors[0]?.message ?? "Некорректные данные";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailVerified: true },
    });

    if (!user?.email) {
        return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (user.email.toLowerCase() !== email) {
        return NextResponse.json({ error: "Email не совпадает с аккаунтом" }, { status: 403 });
    }

    if (user.emailVerified != null) {
        return NextResponse.json({ error: "Почта уже подтверждена" }, { status: 400 });
    }

    try {
        await sendWelcomeEmail(email, user.name ?? "");
    } catch (error) {
        console.error("[resend-verification] Failed to send email:", error);
        return NextResponse.json(
            { error: "Не удалось отправить письмо. Попробуйте позже." },
            { status: 502 },
        );
    }

    return NextResponse.json({ ok: true });
}

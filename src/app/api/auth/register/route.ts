import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 10;

const registerSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Укажите email")
        .email("Некорректный email")
        .transform((v) => v.toLowerCase()),
    password: z
        .string()
        .min(8, "Пароль должен быть не короче 8 символов"),
    name: z
        .string()
        .trim()
        .min(2, "Имя должно быть не короче 2 символов"),
});

export async function POST(request: Request) {
    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
        const message = parsed.error.errors[0]?.message ?? "Некорректные данные";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json(
            { error: "Пользователь с таким email уже зарегистрирован" },
            { status: 409 },
        );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.user.create({
        data: {
            email,
            passwordHash,
            name,
            emailVerified: null,
            phone: null,
            image: null,
        },
    });

    try {
        await sendWelcomeEmail(email, name);
    } catch (error) {
        console.error("[register] Failed to send welcome email:", error);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
}

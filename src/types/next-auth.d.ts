/**
 * Расширяем типы NextAuth: email-авторизация, id пользователя — number в сессии.
 * Телефон не хранится в JWT/сессии (указывается на чекауте, читается из БД в профиле).
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: number | null;
            email: string | null;
            name?: string | null;
            image?: string | null;
        } & DefaultSession["user"];
    }

    /** User при authorize: id всегда string (контракт NextAuth), конвертируется в number в JWT. */
    interface User {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        uid?: number;
        name?: string | null;
        email?: string | null;
        picture?: string | null;
    }
}

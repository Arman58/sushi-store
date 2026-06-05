import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

/**
 * NextAuth: JWT-сессии, вход по email + пароль.
 * Lazy Verification: emailVerified === null не блокирует вход и заказы.
 */
export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 /* 30 дней */ },
    providers: [
        CredentialsProvider({
            name: "Email and Password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = String(credentials.email).trim().toLowerCase();
                const password = String(credentials.password);

                if (!email || password.length < 1) return null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user?.passwordHash) return null;

                const valid = await bcrypt.compare(password, user.passwordHash);
                if (!valid) return null;

                return {
                    id: String(user.id),
                    name: user.name ?? "",
                    email: user.email,
                    image: user.image,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const u = user as {
                    id: string;
                    name?: string | null;
                    email?: string | null;
                    image?: string | null;
                };
                token.uid = Number.parseInt(u.id, 10);
                token.name = u.name ?? null;
                token.email = u.email ?? null;
                token.picture = u.image ?? null;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = typeof token.uid === "number" ? token.uid : null;
                session.user.name =
                    (token.name as string | null) ?? session.user.name ?? null;
                session.user.email =
                    (token.email as string | null) ?? session.user.email ?? null;
                session.user.image =
                    (token.picture as string | null) ?? session.user.image ?? null;
            }
            return session;
        },
    },
    pages: {
        signIn: "/",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

/** Удобный хелпер для серверных компонентов и роут-хендлеров. */
export function auth() {
    return getServerSession(authOptions);
}

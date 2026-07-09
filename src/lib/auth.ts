import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { normalizeEmail } from "@/lib/normalize-email";
import { EMAIL_NOT_VERIFIED_ERROR } from "@/lib/otp-auth";
import { prisma } from "@/lib/prisma";
import {
    isUserSessionRevoked,
    revokeUserSessionToken,
} from "@/lib/user-session";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Без явного domain - куки привязаны к текущему хосту (localhost или eastwestnh.com).
 * secure только на проде, чтобы dev на http://localhost работал без HTTPS.
 */
const sessionCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
};

/**
 * NextAuth: JWT-сессии, вход по email + пароль.
 * emailVerified обязателен - без OTP-подтверждения вход блокируется.
 * jti + Redis denylist позволяют отозвать сессию при logout.
 */
export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 /* 30 дней */ },
    useSecureCookies: isProduction,
    cookies: {
        sessionToken: {
            name: isProduction
                ? "__Secure-next-auth.session-token"
                : "next-auth.session-token",
            options: sessionCookieOptions,
        },
        callbackUrl: {
            name: isProduction
                ? "__Secure-next-auth.callback-url"
                : "next-auth.callback-url",
            options: sessionCookieOptions,
        },
        csrfToken: {
            name: isProduction
                ? "__Host-next-auth.csrf-token"
                : "next-auth.csrf-token",
            options: sessionCookieOptions,
        },
    },
    providers: [
        CredentialsProvider({
            name: "Email and Password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = normalizeEmail(String(credentials.email));
                const password = String(credentials.password);

                if (!email || password.length < 1) return null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user?.passwordHash) return null;

                const valid = await bcrypt.compare(password, user.passwordHash);
                if (!valid) return null;

                if (user.emailVerified == null) {
                    throw new Error(EMAIL_NOT_VERIFIED_ERROR);
                }

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
                token.jti = randomUUID();
            }

            const jti = typeof token.jti === "string" ? token.jti : "";
            if (jti && (await isUserSessionRevoked(jti))) {
                // Invalidate JWT payload so session.user.id becomes null.
                return {
                    ...token,
                    uid: undefined,
                    jti: undefined,
                    name: null,
                    email: null,
                    picture: null,
                    exp: 0,
                };
            }

            return token;
        },
        async session({ session, token }) {
            if (!token?.uid) {
                session.user = {
                    ...session.user,
                    id: null,
                    name: null,
                    email: null,
                    image: null,
                };
                return session;
            }

            if (session.user) {
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
    events: {
        async signOut(message) {
            const token = "token" in message ? message.token : null;
            const jti = typeof token?.jti === "string" ? token.jti : "";
            if (!jti) return;
            const exp = typeof token?.exp === "number" ? token.exp : undefined;
            await revokeUserSessionToken(jti, exp);
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

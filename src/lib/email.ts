import { render } from "@react-email/render";
import { Resend } from "resend";

import OtpEmail from "@/emails/otp-email";
import WelcomeEmail from "@/emails/welcome-email";
import type { AppLocale } from "@/i18n/routing";
import {
    NOTIFICATION_FETCH_TIMEOUT_MS,
    withTimeout,
} from "@/lib/fetch-with-timeout";
import { SITE_URL } from "@/lib/site-config";

const resendApiKey = process.env.RESEND_API_KEY;

/** Локальная разработка — Resend sandbox принимает только этот отправитель. */
const DEV_FROM = "East West Delivery <onboarding@resend.dev>";

const WELCOME_SUBJECT: Record<AppLocale, string> = {
    ru: "Добро пожаловать в East West Delivery! 🍣",
    hy: "Բարի գալուստ East West Delivery! 🍣",
    en: "Welcome to East West Delivery! 🍣",
};

function normalizeLocale(locale?: string): AppLocale {
    if (locale === "ru" || locale === "en" || locale === "hy") {
        return locale;
    }
    return "hy";
}

/** Ленивая инициализация — не падаем при сборке без ключа. */
function getResendClient(): Resend | null {
    if (!resendApiKey?.trim()) return null;
    return new Resend(resendApiKey);
}

/**
 * RESEND_FROM — верифицированный отправитель на проде
 * (например East West Delivery <noreply@eastwestnh.com>).
 * Без переменной — onboarding@resend.dev для локальной разработки.
 */
function getFromAddress(): string {
    const configured = process.env.RESEND_FROM?.trim();
    if (configured) return configured;
    return DEV_FROM;
}

/**
 * Resend в тестовом режиме доставляет письма только на email владельца аккаунта.
 * RESEND_DEV_REDIRECT_TO — inbox для локальной разработки (ваш email в Resend).
 */
function resolveRecipient(to: string): {
    recipient: string;
    devRedirectNote: string | null;
} {
    const redirect = process.env.RESEND_DEV_REDIRECT_TO?.trim().toLowerCase();
    const normalizedTo = to.trim().toLowerCase();

    if (
        process.env.NODE_ENV === "development" &&
        redirect &&
        normalizedTo !== redirect
    ) {
        return {
            recipient: redirect,
            devRedirectNote: normalizedTo,
        };
    }

    return { recipient: normalizedTo, devRedirectNote: null };
}

function buildMenuUrl(): string {
    const base = SITE_URL || "https://eastwestnh.com";
    return `${base.replace(/\/$/, "")}/menu`;
}

function formatResendError(
    message: string,
    from: string,
    intendedTo: string,
    actualTo: string,
): string {
    const sandboxHint =
        message.includes("only send testing emails to your own email")
            ? " Resend sandbox: добавьте RESEND_DEV_REDIRECT_TO в .env.local (email вашего аккаунта Resend) или верифицируйте домен на resend.com/domains."
            : "";
    return `[Resend] ${message} (from: ${from}, intended: ${intendedTo}, sent to: ${actualTo})${sandboxHint}`;
}

const OTP_SUBJECT: Record<AppLocale, string> = {
    ru: "Код подтверждения East West Delivery",
    hy: "East West Delivery հաստատման կոդ",
    en: "East West Delivery verification code",
};

export type SendEmailResult = { sent: boolean };

export type SendWelcomeEmailResult = SendEmailResult;

/**
 * Приветственное письмо после регистрации / повторная отправка из профиля.
 * Никогда не бросает исключение — ошибки логируются, UX не блокируется.
 */
export async function sendWelcomeEmail(
    to: string,
    _name: string,
    locale?: AppLocale | string,
): Promise<SendWelcomeEmailResult> {
    const resend = getResendClient();
    if (!resend) {
        console.error("Resend error: RESEND_API_KEY is not configured");
        return { sent: false };
    }

    const resolvedLocale = normalizeLocale(locale);
    const from = getFromAddress();
    const { recipient, devRedirectNote } = resolveRecipient(to);
    const menuUrl = buildMenuUrl();

    let html: string;
    try {
        html = await render(
            WelcomeEmail({
                locale: resolvedLocale,
                menuUrl,
                devRedirectNote,
            }),
        );
    } catch (error) {
        console.error("Resend error:", error);
        return { sent: false };
    }

    try {
        const { error } = await withTimeout(
            resend.emails.send({
                from,
                to: [recipient],
                subject: WELCOME_SUBJECT[resolvedLocale],
                html,
            }),
            NOTIFICATION_FETCH_TIMEOUT_MS,
            "Resend welcome email",
        );

        if (error) {
            console.error(
                "Resend error:",
                formatResendError(error.message, from, to, recipient),
            );
            return { sent: false };
        }

        return { sent: true };
    } catch (error) {
        console.error("Resend error:", error);
        return { sent: false };
    }
}

/**
 * OTP-код для подтверждения email при регистрации.
 * Никогда не бросает исключение — ошибки логируются.
 */
export async function sendOtpEmail(
    to: string,
    code: string,
    locale?: AppLocale | string,
): Promise<SendEmailResult> {
    const resend = getResendClient();
    if (!resend) {
        console.error("Resend error: RESEND_API_KEY is not configured");
        return { sent: false };
    }

    const resolvedLocale = normalizeLocale(locale);
    const from = getFromAddress();
    const { recipient, devRedirectNote } = resolveRecipient(to);

    let html: string;
    try {
        html = await render(
            OtpEmail({
                locale: resolvedLocale,
                code,
                devRedirectNote,
            }),
        );
    } catch (error) {
        console.error("Resend error:", error);
        return { sent: false };
    }

    try {
        const { error } = await withTimeout(
            resend.emails.send({
                from,
                to: [recipient],
                subject: OTP_SUBJECT[resolvedLocale],
                html,
            }),
            NOTIFICATION_FETCH_TIMEOUT_MS,
            "Resend OTP email",
        );

        if (error) {
            console.error(
                "Resend error:",
                formatResendError(error.message, from, to, recipient),
            );
            return { sent: false };
        }

        return { sent: true };
    } catch (error) {
        console.error("Resend error:", error);
        return { sent: false };
    }
}

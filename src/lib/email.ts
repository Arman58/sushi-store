import { render } from "@react-email/render";
import { Resend } from "resend";

import OtpEmail from "@/emails/otp-email";
import type { AppLocale } from "@/i18n/routing";
import {
    NOTIFICATION_FETCH_TIMEOUT_MS,
    withTimeout,
} from "@/lib/fetch-with-timeout";

const resendApiKey = process.env.RESEND_API_KEY;

/** Локальная разработка - Resend sandbox принимает только этот отправитель. */
const DEV_FROM = "East West Delivery <onboarding@resend.dev>";

function normalizeLocale(locale?: string): AppLocale {
    if (locale === "ru" || locale === "en" || locale === "hy") {
        return locale;
    }
    return "hy";
}

/** Ленивая инициализация - не падаем при сборке без ключа. */
function getResendClient(): Resend | null {
    if (!resendApiKey?.trim()) return null;
    return new Resend(resendApiKey);
}

/**
 * RESEND_FROM - верифицированный отправитель на проде
 * (например East West Delivery <noreply@eastwestnh.com>).
 * Без переменной - onboarding@resend.dev для локальной разработки.
 */
function getFromAddress(): string {
    const configured = process.env.RESEND_FROM?.trim();
    if (configured) return configured;
    return DEV_FROM;
}

/**
 * RESEND_DEV_REDIRECT_TO - на Preview и в .env.local все письма уходят на этот inbox,
 * чтобы не отправить письмо реальному клиенту при тестах.
 */
function resolveRecipient(to: string): {
    recipient: string;
    devRedirectNote: string | null;
} {
    const redirect = process.env.RESEND_DEV_REDIRECT_TO?.trim().toLowerCase();
    const normalizedTo = to.trim().toLowerCase();

    if (redirect && normalizedTo !== redirect) {
        return {
            recipient: redirect,
            devRedirectNote: normalizedTo,
        };
    }

    return { recipient: normalizedTo, devRedirectNote: null };
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

/**
 * OTP-код для подтверждения email при регистрации.
 * Никогда не бросает исключение - ошибки логируются.
 */
export async function sendOtpEmail(
    to: string,
    code: string,
    locale?: AppLocale | string,
): Promise<SendEmailResult> {
    const resend = getResendClient();
    if (!resend) {
        console.error("[RESEND ERROR] RESEND_API_KEY is not configured");
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
        console.error("[RESEND ERROR]", error);
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
                "[RESEND ERROR]",
                formatResendError(error.message, from, to, recipient),
            );
            return { sent: false };
        }

        return { sent: true };
    } catch (error) {
        console.error("[RESEND ERROR]", error);
        return { sent: false };
    }
}

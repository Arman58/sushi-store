import type { AppLocale } from "@/i18n/routing";
import { sendOtpEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/normalize-email";
import {
    deleteOtpCode,
    generateOtpCode,
    getOtpCode,
    saveOtpCode,
} from "@/lib/otp-store";

export const EMAIL_NOT_VERIFIED_ERROR = "EMAIL_NOT_VERIFIED";

export async function issueOtpForEmail(
    email: string,
    locale?: AppLocale | string,
): Promise<{ code: string; sent: boolean }> {
    const normalizedEmail = normalizeEmail(email);
    const code = generateOtpCode();
    await saveOtpCode(normalizedEmail, code);

    const { sent } = await sendOtpEmail(normalizedEmail, code, locale);
    return { code, sent };
}

export type OtpVerifyResult = "valid" | "expired" | "invalid";

export async function verifyOtpCode(
    email: string,
    code: string,
): Promise<OtpVerifyResult> {
    const normalizedEmail = normalizeEmail(email);
    const cleanCode = String(code).trim();

    if (!/^\d{4}$/.test(cleanCode)) {
        return "invalid";
    }

    const redisCode = await getOtpCode(normalizedEmail);
    if (!redisCode) {
        return "expired";
    }

    if (String(redisCode) === cleanCode) {
        await deleteOtpCode(normalizedEmail);
        return "valid";
    }

    return "invalid";
}

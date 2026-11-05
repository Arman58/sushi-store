import type { AppLocale } from "@/i18n/routing";
import { sendOtpEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/normalize-email";
import {
    claimOtpResendCooldown,
    consumeOtpCode,
    generateOtpCode,
    isValidOtpCodeFormat,
    type OtpVerifyResult,
    saveOtpCode,
} from "@/lib/otp-store";

export const EMAIL_NOT_VERIFIED_ERROR = "EMAIL_NOT_VERIFIED";

export async function issueOtpForEmail(
    email: string,
    locale?: AppLocale | string,
): Promise<{ code: string | null; sent: boolean; cooldown?: boolean }> {
    const normalizedEmail = normalizeEmail(email);
    if (!(await claimOtpResendCooldown(normalizedEmail))) {
        return { code: null, sent: false, cooldown: true };
    }
    const code = generateOtpCode();
    await saveOtpCode(normalizedEmail, code);

    const { sent } = await sendOtpEmail(normalizedEmail, code, locale);
    return { code, sent };
}

export type { OtpVerifyResult } from "@/lib/otp-store";

export async function verifyOtpCode(
    email: string,
    code: string,
): Promise<OtpVerifyResult> {
    const normalizedEmail = normalizeEmail(email);
    const cleanCode = String(code).trim();

    if (!isValidOtpCodeFormat(cleanCode)) {
        return "invalid";
    }

    return consumeOtpCode(normalizedEmail, cleanCode);
}

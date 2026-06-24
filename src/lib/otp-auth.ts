import type { AppLocale } from "@/i18n/routing";
import { sendOtpEmail } from "@/lib/email";
import {
    deleteOtpCode,
    generateOtpCode,
    getOtpCode,
    saveOtpCode,
} from "@/lib/otp-store";
import { timingSafeEqual } from "node:crypto";

export const EMAIL_NOT_VERIFIED_ERROR = "EMAIL_NOT_VERIFIED";

export async function issueOtpForEmail(
    email: string,
    locale?: AppLocale | string,
): Promise<{ code: string; sent: boolean }> {
    const code = generateOtpCode();
    await saveOtpCode(email, code);
    const { sent } = await sendOtpEmail(email, code, locale);
    return { code, sent };
}

export async function verifyOtpCode(
    email: string,
    code: string,
): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    if (!/^\d{4}$/.test(normalizedCode)) {
        return false;
    }

    const stored = await getOtpCode(normalizedEmail);
    if (!stored) {
        return false;
    }

    const storedBuf = Buffer.from(stored);
    const providedBuf = Buffer.from(normalizedCode);
    if (storedBuf.length !== providedBuf.length) {
        return false;
    }

    const matches = timingSafeEqual(storedBuf, providedBuf);
    if (matches) {
        await deleteOtpCode(normalizedEmail);
    }

    return matches;
}

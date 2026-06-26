import { SITE_URL } from "@/lib/site-config";

export function areVapidKeysConfigured(): boolean {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    return Boolean(publicKey && privateKey);
}

/** mailto: subject required by web-push VAPID spec. */
export function getVapidSubject(): string {
    const resendFrom = process.env.RESEND_FROM?.trim();
    if (resendFrom) {
        const bracketMatch = /<([^>]+@[^>]+)>/.exec(resendFrom);
        if (bracketMatch?.[1]) {
            return `mailto:${bracketMatch[1].trim()}`;
        }
        if (/^[^\s<]+@[^\s>]+$/.test(resendFrom)) {
            return `mailto:${resendFrom}`;
        }
    }

    if (SITE_URL) {
        try {
            return new URL(SITE_URL).origin;
        } catch {
            /* fall through */
        }
    }

    return "mailto:noreply@eastwestnh.com";
}

export function getVapidPublicKey(): string | null {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

export function getVapidPrivateKey(): string | null {
    return process.env.VAPID_PRIVATE_KEY?.trim() || null;
}

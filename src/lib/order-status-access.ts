import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { orderAccessCookieName } from "@/lib/order-access";
import { normalizePhoneToE164Digits } from "@/lib/phone";

type OrderAccessTarget = {
    id: number;
    userId: number | null;
    phone: string;
    accessToken: string;
};

function canonicalPhoneDigits(phone: string): string {
    return normalizePhoneToE164Digits(phone) || phone.replace(/\D/g, "");
}

export function phonesMatch(stored: string, provided: string): boolean {
    const storedCanon = canonicalPhoneDigits(stored);
    const providedCanon = canonicalPhoneDigits(provided);

    if (!storedCanon || !providedCanon) return false;
    if (storedCanon === providedCanon) return true;

    if (storedCanon.length === 11 && providedCanon.length === 8) {
        return storedCanon.endsWith(providedCanon);
    }

    if (providedCanon.length === 11 && storedCanon.length === 8) {
        return providedCanon.endsWith(storedCanon);
    }

    return false;
}

export async function canAccessOrderStatus(
    order: OrderAccessTarget,
    phone?: string,
): Promise<boolean> {
    const session = await auth();
    const sessionUserId =
        session?.user?.id != null && Number.isFinite(Number(session.user.id))
            ? Number(session.user.id)
            : null;

    if (
        sessionUserId != null &&
        order.userId != null &&
        sessionUserId === order.userId
    ) {
        return true;
    }

    const cookieStore = await cookies();
    const accessKey = cookieStore.get(orderAccessCookieName(order.id))?.value;
    if (accessKey && accessKey === order.accessToken) {
        return true;
    }

    const trimmedPhone = phone?.trim();
    if (trimmedPhone) {
        return phonesMatch(order.phone, trimmedPhone);
    }

    return false;
}

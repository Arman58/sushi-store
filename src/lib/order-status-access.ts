import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { orderAccessCookieName } from "@/lib/order-access";

type OrderAccessTarget = {
    id: number;
    userId: number | null;
    accessToken: string;
};

export async function canAccessOrderStatus(
    order: OrderAccessTarget,
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

    return false;
}

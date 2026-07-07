import Box from "@mui/material/Box";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/server";
import { auth } from "@/lib/auth";
import { orderAccessCookieName } from "@/lib/order-access";
import { prisma } from "@/lib/prisma";
import { JsonLd, orderJsonLd } from "@/lib/seo/json-ld";
import { NOINDEX_METADATA } from "@/lib/seo/metadata";
import type { OrderStatusResponse } from "@/shared/api/order-api";
import { PushPermissionPrompt } from "@/shared/ui/PushPermissionPrompt";

import { OrderTracker } from "./order-tracker";

type PageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ key?: string }>;
};

export const metadata: Metadata = NOINDEX_METADATA;

export default async function OrderPage({ params, searchParams }: PageProps) {
    const { id: rawId } = await params;
    const { key: accessKey } = await searchParams;
    const id = Number.parseInt(rawId, 10);
    if (!Number.isFinite(id)) notFound();

    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!order) notFound();

    const session = await auth();
    const sessionUserId =
        session?.user?.id != null && Number.isFinite(Number(session.user.id))
            ? Number(session.user.id)
            : null;

    const isOwner =
        sessionUserId != null &&
        order.userId != null &&
        order.userId === sessionUserId;

    const cookieStore = await cookies();
    const cookieAccessKey = cookieStore.get(orderAccessCookieName(id))?.value;

    // Legacy ?key= для шаринга; cookie - основной путь после чекаута (см. lib/order-access.ts).
    const hasValidKey =
        (accessKey != null &&
            accessKey.length > 0 &&
            accessKey === order.accessToken) ||
        (cookieAccessKey != null && cookieAccessKey === order.accessToken);

    if (!isOwner && !hasValidKey) {
        redirect({ href: "/order-status", locale: await getLocale() });
    }

    const orderPayload: OrderStatusResponse = {
        id: order.id,
        status: order.status,
        name: order.name,
        phone: order.phone,
        delivery: order.delivery,
        payment: order.payment,
        changeFrom: order.changeFrom,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt.toISOString(),
        estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString() ?? null,
        address: order.address,
        deliveryZoneName: order.deliveryZoneName,
        deliveryPrice: order.deliveryPrice,
        items: order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedModifiers: item.selectedModifiers,
        })),
    };

    const structuredOrder = orderJsonLd({
        id: order.id,
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        })),
    });

    return (
        <>
            {structuredOrder ? <JsonLd data={structuredOrder} /> : null}
            <Box
                sx={{
                    minHeight: "70vh",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    py: { xs: 3, md: 6 },
                    px: 2,
                    bgcolor: "background.default",
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 600 }}>
                    {session && <PushPermissionPrompt />}
                    <OrderTracker order={orderPayload} phone={order.phone} />
                </Box>
            </Box>
        </>
    );
}

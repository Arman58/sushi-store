import Box from "@mui/material/Box";
import type { OrderStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatusResponse } from "@/shared/api/order-api";

import { OrderTracker } from "./order-tracker";

type PageProps = {
    params: Promise<{ id: string }>;
};

function etaMinutesFor(orderStatus: OrderStatus): OrderStatusResponse["etaMinutes"] {
    switch (orderStatus) {
        case "NEW":
            return 60;
        case "IN_WORK":
            return 40;
        case "DELIVERING":
            return 20;
        case "DONE":
            return 0;
        case "CANCELLED":
        default:
            return 0;
    }
}

export default async function OrderPage({ params }: PageProps) {
    const { id: rawId } = await params;
    const id = Number.parseInt(rawId, 10);
    if (!Number.isFinite(id)) notFound();

    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!order) notFound();

    const session = await auth();
    const sessionUserId = session?.user?.id ?? null;
    if (
        sessionUserId == null ||
        order.userId == null ||
        order.userId !== sessionUserId
    ) {
        redirect("/order-status");
    }

    const orderPayload: OrderStatusResponse = {
        id: order.id,
        status: order.status,
        delivery: order.delivery,
        payment: order.payment,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt.toISOString(),
        address: order.address,
        deliveryZoneName: order.deliveryZoneName,
        deliveryPrice: order.deliveryPrice,
        items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            selectedModifiers: item.selectedModifiers,
        })),
        etaMinutes: etaMinutesFor(order.status),
    };

    return (
        <Box
            sx={{
                minHeight: "70vh",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                py: { xs: 4, md: 8 },
                px: 2,
                bgcolor: "#fff",
            }}
        >
            <OrderTracker order={orderPayload} phone={order.phone} />
        </Box>
    );
}

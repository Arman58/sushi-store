import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { orderStatusChipColor } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { NOINDEX_METADATA } from "@/lib/seo/metadata";
import { translateOrderStatus } from "@/shared/lib/order-status-labels";
import { EmptyCart } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { ProfileOrderActions } from "../profile-order-actions";
import type { ProfileOrderItem } from "../types";

export const metadata: Metadata = NOINDEX_METADATA;
export const dynamic = "force-dynamic";

export default async function ProfileOrdersPage() {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const locale = await getLocale();
    const t = await getTranslations("profile");
    const tStatus = await getTranslations("order.status");

    if (!userId) {
        return null;
    }

    let orders: Awaited<
        ReturnType<
            typeof prisma.order.findMany<{
                include: {
                    items: {
                        select: {
                            id: true;
                            name: true;
                            price: true;
                            quantity: true;
                            productId: true;
                            selectedModifiers: true;
                        };
                    };
                };
            }>
        >
    > = [];

    try {
        orders = await prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                items: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        quantity: true,
                        productId: true,
                        selectedModifiers: true,
                    },
                },
            },
            take: 50,
        });
    } catch {
        orders = [];
    }

    const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const numberFormatter = new Intl.NumberFormat(locale);

    return orders.length === 0 ? (
        <EmptyCart
            layout="page"
            title={t("empty.title")}
            subtitle={t("empty.subtitle")}
            ctaLabel={t("empty.cta")}
        />
    ) : (
        <Stack spacing={2.5}>
            {orders.map((order) => {
                const items: ProfileOrderItem[] = order.items.map((item) => ({
                    productId: item.productId ?? null,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    selectedModifiers: item.selectedModifiers,
                }));
                return (
                    <Paper
                        key={order.id}
                        elevation={0}
                        sx={{
                            p: { xs: 2.5, sm: 3 },
                            borderRadius: 3.5,
                            border: `1px solid ${tokens.border}`,
                            bgcolor: "var(--ew-surface)",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                                transform: "translateY(-2px)",
                                boxShadow: "0 6px 20px rgba(var(--ew-text-rgb), 0.06)",
                                borderColor: tokens.brandGlow,
                            }
                        }}
                    >
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            spacing={1.5}
                            sx={{ mb: 2 }}
                        >
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.25 }}>
                                    {t("orderNumber", { id: order.id })}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {dateFormatter.format(order.createdAt)}
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" }, justifyContent: { xs: "space-between", sm: "flex-end" } }}>
                                <Chip
                                    size="small"
                                    color={orderStatusChipColor(order.status)}
                                    label={translateOrderStatus(order.status, tStatus)}
                                    sx={{
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        px: 0.5,
                                    }}
                                />
                                <Typography variant="h6" fontWeight={800} color="primary.main">
                                    {numberFormatter.format(order.totalPrice)} ֏
                                </Typography>
                            </Stack>
                        </Stack>

                        <Divider sx={{ borderColor: tokens.border, mb: 2 }} />

                        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                            {order.items.map((item) => {
                                const modsRaw = item.selectedModifiers;
                                const mods =
                                    Array.isArray(modsRaw)
                                        ? (modsRaw as Array<{ name?: string }>)
                                              .map((m) =>
                                                  m && typeof m.name === "string"
                                                      ? m.name
                                                      : null,
                                              )
                                              .filter((s): s is string => Boolean(s))
                                        : [];
                                return (
                                    <Box key={item.id}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                                {item.name} <Box component="span" sx={{ color: "text.disabled", mx: 0.5 }}>×</Box> {item.quantity}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {numberFormatter.format(
                                                    item.price * item.quantity,
                                                )}{" "}
                                                ֏
                                            </Typography>
                                        </Stack>
                                        {mods.length > 0 && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: "block", mt: 0.25, pl: 1, borderLeft: `2px solid ${tokens.brand}` }}
                                            >
                                                {mods.join(", ")}
                                            </Typography>
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>

                        <ProfileOrderActions orderId={order.id} items={items} />
                    </Paper>
                );
            })}
        </Stack>
    );
}

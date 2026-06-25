import Avatar from "@mui/material/Avatar";
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
import { formatPhoneForDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { NOINDEX_METADATA } from "@/lib/seo/metadata";
import { translateOrderStatus } from "@/shared/lib/order-status-labels";
import { EmptyCart, PageContainer, PushPermissionPrompt, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { ProfileEmailVerificationAlert } from "./profile-email-verification-alert";
import { ProfileLoginPrompt } from "./profile-login-prompt";
import { ProfileOrderActions } from "./profile-order-actions";
import { ProfileSessionGuard } from "./profile-session-guard";
import type { ProfileOrderItem } from "./types";

export const metadata: Metadata = NOINDEX_METADATA;

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const locale = await getLocale();
    const t = await getTranslations("profile");
    const tStatus = await getTranslations("order.status");

    if (!userId) {
        return <ProfileLoginPrompt reason="no_session" />;
    }

    let user;
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
        user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                phone: true,
                createdAt: true,
            },
        });
    } catch {
        return <ProfileLoginPrompt reason="session_expired" />;
    }

    if (!user) {
        return <ProfileLoginPrompt reason="session_expired" />;
    }

    try {
        orders = await prisma.order.findMany({
            where: { userId: user.id },
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

    const displayName = (user.name ?? "").trim() || t("defaultName");
    const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const numberFormatter = new Intl.NumberFormat(locale);

    return (
        <>
            <ProfileSessionGuard />
            <PageContainer>
                <SectionTitle pageTitle>{t("pageTitle")}</SectionTitle>

                {user.emailVerified == null && user.email ? (
                    <ProfileEmailVerificationAlert email={user.email} />
                ) : null}

                {user.emailVerified != null ? <PushPermissionPrompt /> : null}

                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 3 },
                        mb: 3,
                        borderRadius: 2,
                        border: `1px solid ${tokens.border}`,
                        bgcolor: "#fff",
                    }}
                >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                        <Avatar
                            src={user.image ?? undefined}
                            alt={displayName}
                            sx={{
                                width: 56,
                                height: 56,
                                fontWeight: 700,
                                bgcolor: tokens.brand,
                            }}
                        >
                            {displayName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography component="p" variant="body1" fontWeight={700}>
                                {displayName}
                            </Typography>
                            {user.email ? (
                                <Typography variant="body2" color="text.secondary">
                                    {user.email}
                                </Typography>
                            ) : null}
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: user.email ? 0.5 : 0 }}
                            >
                                {user.phone
                                    ? formatPhoneForDisplay(user.phone)
                                    : t("phoneMissing")}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                            {t("memberSince", { date: dateFormatter.format(user.createdAt) })}
                        </Typography>
                    </Stack>
                </Paper>

                <Typography component="h2" variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
                    {t("orderHistory")}
                </Typography>

                {orders.length === 0 ? (
                    <EmptyCart
                        layout="page"
                        title={t("empty.title")}
                        subtitle={t("empty.subtitle")}
                        ctaLabel={t("empty.cta")}
                    />
                ) : (
                    <Stack spacing={2}>
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
                                        p: { xs: 2, md: 2.5 },
                                        borderRadius: 2,
                                        border: `1px solid ${tokens.border}`,
                                        bgcolor: "#fff",
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        justifyContent="space-between"
                                        alignItems={{ xs: "flex-start", sm: "center" }}
                                        sx={{ mb: 1.5, gap: 1 }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700}>
                                                {t("orderNumber", { id: order.id })}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {dateFormatter.format(order.createdAt)}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                size="small"
                                                color={orderStatusChipColor(order.status)}
                                                label={translateOrderStatus(order.status, tStatus)}
                                                sx={{ fontWeight: 600, borderRadius: 999 }}
                                            />
                                            <Typography variant="subtitle1" fontWeight={800}>
                                                {numberFormatter.format(order.totalPrice)} ֏
                                            </Typography>
                                        </Stack>
                                    </Stack>

                                    <Divider sx={{ borderColor: tokens.border, mb: 1.5 }} />

                                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
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
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="body2" color="text.secondary">
                                                            {item.name} × {item.quantity}
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={600}>
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
                )}
            </PageContainer>
        </>
    );
}

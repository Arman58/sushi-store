import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { OrderStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { formatPhoneForDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { EmptyCart, PageContainer, SectionTitle } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { ProfileEmailVerificationAlert } from "./profile-email-verification-alert";
import { ProfileOrderActions } from "./profile-order-actions";
import type { ProfileOrderItem } from "./types";

// Личный кабинет — динамическая страница: каждый запрос проверяет сессию.
export const dynamic = "force-dynamic";

const STATUS_RU: Record<OrderStatus, { label: string; color: "default" | "warning" | "info" | "success" | "error" }> = {
    NEW:        { label: "Принят",       color: "warning" },
    IN_WORK:    { label: "Готовится",    color: "info" },
    DELIVERING: { label: "В доставке",   color: "info" },
    DONE:       { label: "Доставлен",    color: "success" },
    CANCELLED:  { label: "Отменён",      color: "error" },
};

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

export default async function ProfilePage() {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (!userId) {
        // Не залогинен — отправляем на главную, где есть кнопка «Войти».
        redirect("/?login=1");
    }

    const user = await prisma.user.findUnique({
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

    if (!user) {
        // Юзер удалён, но cookie ещё жив — отправляем на главную.
        redirect("/");
    }

    const orders = await prisma.order.findMany({
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

    const displayName = (user.name ?? "").trim() || "Покупатель";

    return (
        <main>
            <PageContainer>
                <SectionTitle>Личный кабинет</SectionTitle>

                {user.emailVerified == null && user.email ? (
                    <ProfileEmailVerificationAlert email={user.email} />
                ) : null}

                {/* User card */}
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
                            <Typography variant="h6" fontWeight={700}>
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
                                    : "Номер телефона не указан (укажите при оформлении заказа)"}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                            С нами с {formatDate(user.createdAt)}
                        </Typography>
                    </Stack>
                </Paper>

                <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
                    История заказов
                </Typography>

                {orders.length === 0 ? (
                    <EmptyCart
                        layout="page"
                        title="Заказов пока нет"
                        subtitle="Самое время выбрать что-нибудь вкусное с меню!"
                        ctaLabel="Перейти в меню"
                    />
                ) : (
                    <Stack spacing={2}>
                        {orders.map((order) => {
                            const status = STATUS_RU[order.status];
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
                                                Заказ №{order.id}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDate(order.createdAt)}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                size="small"
                                                color={status.color}
                                                label={status.label}
                                                sx={{ fontWeight: 600, borderRadius: 999 }}
                                            />
                                            <Typography variant="subtitle1" fontWeight={800}>
                                                {order.totalPrice.toLocaleString("ru-RU")} ֏
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
                                                            {(item.price * item.quantity).toLocaleString(
                                                                "ru-RU",
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
        </main>
    );
}

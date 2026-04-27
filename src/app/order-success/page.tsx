"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PageContainer } from "@/shared/ui";

const ORDER_ID_KEY = "last-order-id";

export default function OrderSuccessPage() {
    const [orderId, setOrderId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(5);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Grab the order ID that was stored right before redirect
        try {
            const id = sessionStorage.getItem(ORDER_ID_KEY);
            if (id) setOrderId(id);
        } catch { /* ignore */ }

        // Countdown for auto-redirect hint
        intervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1_000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <main>
            <PageContainer>
                <Box
                    sx={{
                        mt: { xs: 2, md: 6 },
                        maxWidth: 520,
                        mx: "auto",
                        textAlign: "center",
                    }}
                >
                    {/* Success icon */}
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            bgcolor: "rgba(22,163,74,0.1)",
                            border: "2px solid rgba(22,163,74,0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mx: "auto",
                            mb: 3,
                        }}
                    >
                        <CheckCircleOutlineIcon sx={{ fontSize: 44, color: "success.main" }} />
                    </Box>

                    <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5 }}>
                        Заказ принят! 🎉
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 380, mx: "auto" }}>
                        Мы уже получили ваш заказ в East-West. Оператор свяжется с вами
                        для подтверждения и уточнения деталей доставки.
                    </Typography>

                    {/* ETA banner */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2,
                            mb: 3,
                            borderRadius: 3,
                            bgcolor: "rgba(35,79,74,0.06)",
                            border: "1px solid rgba(35,79,74,0.15)",
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            justifyContent="center"
                            divider={<Divider orientation="vertical" flexItem />}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Ожидание
                                </Typography>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    45–60 мин
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Статус
                                </Typography>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    Принят ✓
                                </Typography>
                            </Box>
                            {orderId && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Заказ №
                                    </Typography>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {orderId}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Paper>

                    {/* Info chips */}
                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        flexWrap="wrap"
                        sx={{ mb: 4, gap: 1 }}
                    >
                        <Chip label="📞 Оператор перезвонит" size="small" sx={{ borderRadius: 999 }} />
                        <Chip label="🛵 Бесплатная доставка" size="small" sx={{ borderRadius: 999 }} />
                        <Chip label="📍 Отслеживание статуса" size="small" sx={{ borderRadius: 999 }} />
                    </Stack>

                    <Stack spacing={1.5}>
                        {orderId && (
                            <Button
                                component={Link}
                                href="/order-status"
                                variant="contained"
                                size="large"
                                fullWidth
                            >
                                Отследить заказ #{orderId}
                            </Button>
                        )}

                        <Button
                            component={Link}
                            href="/menu"
                            variant={orderId ? "outlined" : "contained"}
                            size="large"
                            fullWidth
                        >
                            Вернуться в меню
                        </Button>

                        <Button
                            component={Link}
                            href="/"
                            variant="text"
                            color="inherit"
                            size="large"
                            fullWidth
                            sx={{ opacity: 0.6 }}
                        >
                            На главную
                        </Button>
                    </Stack>
                </Box>
            </PageContainer>
        </main>
    );
}

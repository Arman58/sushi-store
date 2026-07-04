"use client";

import DownloadIcon from "@mui/icons-material/Download";
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { chartsGridClasses } from "@mui/x-charts/ChartsGrid";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode,useMemo, useState } from "react";

import {
    type AdminAnalyticsDailyPoint,
    type AdminAnalyticsResponse,
    buildEmptyAdminAnalyticsResponse,
    downloadOrdersCsv,
    formatAmd,
    truncateChartLabel,
} from "@/lib/admin-analytics";
import { orderStatusChipColor } from "@/lib/order-status";
import { PageContainer, SectionTitle } from "@/shared/ui";

type PeriodDays = 7 | 14 | 30;

const PANEL_SX = {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 3,
    boxShadow: "none",
    p: 3,
} as const;

const AXIS_TICK_STYLE = {
    fontSize: 12,
    fill: "#888",
} as const;

const STATUS_CHART_COLORS: Record<string, string> = {
    NEW: "#0288d1",
    COOKING: "#ed6c02",
    DELIVERING: "#9c27b0",
    DONE: "#2e7d32",
    CANCELLED: "#d32f2f",
};

const PAYMENT_CHART_COLORS: Record<string, string> = {
    CASH: "#0288d1",
    CARD: "#00B341",
};

async function fetchAnalytics(days: PeriodDays): Promise<AdminAnalyticsResponse> {
    const res = await fetch(`/api/admin/analytics?days=${days}`, {
        credentials: "same-origin",
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
        const message =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof (body as { error: unknown }).error === "string"
                ? (body as { error: string }).error
                : "Не удалось загрузить аналитику";
        throw new Error(message);
    }
    return body as AdminAnalyticsResponse;
}

function percentChange(current: number, previous: number): number | null {
    if (previous === 0) {
        return current > 0 ? 100 : null;
    }
    return ((current - previous) / previous) * 100;
}

function dayOverDayDelta(
    daily: AdminAnalyticsDailyPoint[],
    pick: (point: AdminAnalyticsDailyPoint) => number,
): number | null {
    if (daily.length < 2) return null;
    const current = daily[daily.length - 1]!;
    const previous = daily[daily.length - 2]!;
    return percentChange(pick(current), pick(previous));
}

function MetricCard({
    title,
    value,
    delta,
    valueColor,
}: {
    title: string;
    value: string;
    delta?: number | null;
    valueColor?: string;
}) {
    return (
        <Card elevation={0} sx={{ ...PANEL_SX, height: "100%" }}>
            <Typography
                variant="overline"
                sx={{ color: "text.secondary", letterSpacing: 1, display: "block" }}
            >
                {title}
            </Typography>
            <Typography
                variant="h4"
                sx={{
                    fontWeight: 600,
                    mt: 1,
                    lineHeight: 1.2,
                    color: valueColor ?? "text.primary",
                }}
            >
                {value}
            </Typography>
            {delta != null ? (
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.75,
                        color: delta >= 0 ? "success.main" : "error.main",
                        fontWeight: 500,
                    }}
                >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(0)}% к прошлому дню
                </Typography>
            ) : null}
        </Card>
    );
}

function PanelTitle({ children }: { children: ReactNode }) {
    return (
        <Typography
            variant="subtitle2"
            sx={{
                color: "text.primary",
                fontWeight: 600,
                mb: 2.5,
                letterSpacing: "-0.01em",
            }}
        >
            {children}
        </Typography>
    );
}

function EmptyChartState({ message }: { message: string }) {
    return (
        <Box
            sx={{
                minHeight: 280,
                display: "grid",
                placeItems: "center",
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
        </Box>
    );
}

export default function AdminDashboardPage() {
    const theme = useTheme();
    const brandGreen = theme.palette.primary.main;
    const [periodDays, setPeriodDays] = useState<PeriodDays>(14);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin-analytics", periodDays],
        queryFn: () => fetchAnalytics(periodDays),
    });

    const analytics = useMemo(
        () => data ?? buildEmptyAdminAnalyticsResponse(periodDays),
        [data, periodDays],
    );

    const chartLabels = useMemo(
        () => analytics.daily.map((point) => point.label),
        [analytics],
    );

    const revenueSeries = useMemo(
        () => analytics.daily.map((point) => point.revenue),
        [analytics],
    );

    const ordersSeries = useMemo(
        () => analytics.daily.map((point) => point.orders),
        [analytics],
    );

    const pieData = useMemo(
        () =>
            analytics.statusDistribution
                .filter((slice) => slice.count > 0)
                .map((slice) => ({
                    id: slice.status,
                    value: slice.count,
                    label: slice.label,
                    color:
                        STATUS_CHART_COLORS[slice.status] ??
                        orderStatusChipColor(slice.status),
                })),
        [analytics],
    );

    const zoneLabels = useMemo(
        () =>
            analytics.salesByZone.map((zone) =>
                truncateChartLabel(zone.name),
            ),
        [analytics],
    );

    const zoneRevenue = useMemo(
        () => analytics.salesByZone.map((zone) => zone.revenue),
        [analytics],
    );

    const hourLabels = useMemo(
        () => analytics.salesByHour.map((slice) => String(slice.hour)),
        [analytics],
    );

    const hourOrders = useMemo(
        () => analytics.salesByHour.map((slice) => slice.orders),
        [analytics],
    );

    const paymentPieData = useMemo(() => {
        const methods = analytics.paymentMethods;
        const totalRevenue = methods.reduce((sum, item) => sum + item.revenue, 0);

        return methods
            .filter((item) => item.orders > 0)
            .map((item) => {
                const percent =
                    totalRevenue > 0
                        ? Math.round((item.revenue / totalRevenue) * 100)
                        : 0;
                return {
                    id: item.method,
                    value: item.revenue,
                    label: `${item.label} · ${percent}% · ${formatAmd(item.revenue)}`,
                    color: PAYMENT_CHART_COLORS[item.method] ?? brandGreen,
                };
            });
    }, [analytics, brandGreen]);

    const revenueDelta = useMemo(
        () => dayOverDayDelta(analytics.daily, (point) => point.revenue),
        [analytics],
    );

    const ordersDelta = useMemo(
        () => dayOverDayDelta(analytics.daily, (point) => point.orders),
        [analytics],
    );

    const chartSx = useMemo(
        () => ({
            [`& .${chartsGridClasses.line}`]: {
                stroke: "var(--ew-border)",
                strokeDasharray: "3 3",
            },
            "& .MuiChartsAxis-root line": {
                stroke: "var(--ew-border-hi)",
            },
            "& .MuiChartsAxis-tickLabel": {
                fill: "var(--ew-text-3) !important",
                fontSize: "12px !important",
            },
            "& .MuiChartsLegend-label": {
                fontSize: "12px !important",
            },
        }),
        [],
    );

    const tooltipSx = {
        fontSize: 12,
        px: 1.25,
        py: 0.75,
        borderRadius: 1.5,
        boxShadow: "none",
        border: "1px solid",
        borderColor: "divider",
    } as const;

    return (
        <PageContainer>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={2}
                sx={{ mb: 2 }}
            >
                <SectionTitle pageTitle>Аналитика</SectionTitle>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "stretch", sm: "center" }}
                >
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        disabled={!analytics.exportOrders.length}
                        onClick={() => {
                            downloadOrdersCsv(
                                analytics.exportOrders,
                                analytics.periodDays,
                            );
                        }}
                        sx={{
                            textTransform: "none",
                            fontWeight: 500,
                            borderColor: "divider",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Скачать отчет (CSV)
                    </Button>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={periodDays}
                        onChange={(_, value: PeriodDays | null) => {
                            if (value) setPeriodDays(value);
                        }}
                        sx={{
                            alignSelf: { xs: "flex-start", sm: "center" },
                            "& .MuiToggleButton-root": {
                                textTransform: "none",
                                fontWeight: 500,
                                px: 2,
                                borderColor: "divider",
                            },
                        }}
                    >
                        <ToggleButton value={7}>7 дней</ToggleButton>
                        <ToggleButton value={14}>14 дней</ToggleButton>
                        <ToggleButton value={30}>30 дней</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </Stack>

            {isError ? (
                <Alert severity="error" sx={{ mb: 3, boxShadow: "none" }}>
                    {error instanceof Error
                        ? error.message
                        : "Ошибка загрузки данных"}
                </Alert>
            ) : null}

            {isLoading && !data ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Stack spacing={3} sx={{ minWidth: 0 }}>
                    <Box
                        sx={{
                            display: "grid",
                            gap: 3,
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                                lg: "repeat(5, 1fr)",
                            },
                        }}
                    >
                        <MetricCard
                            title="Выручка за сегодня"
                            value={formatAmd(analytics.summary.revenueToday)}
                            delta={revenueDelta}
                        />
                        <MetricCard
                            title="Заказов сегодня"
                            value={String(analytics.summary.ordersToday)}
                            delta={ordersDelta}
                        />
                        <MetricCard
                            title="Средний чек"
                            value={formatAmd(analytics.summary.averageCheck)}
                        />
                        <MetricCard
                            title="Активных заказов"
                            value={String(analytics.summary.activeOrders)}
                        />
                        <MetricCard
                            title="Скидки выдано"
                            value={formatAmd(analytics.promoImpact)}
                            valueColor="error.main"
                        />
                    </Box>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 8 }}>
                            <Card elevation={0} sx={PANEL_SX}>
                                <PanelTitle>
                                    Выручка и заказы за {analytics.periodDays} дней
                                </PanelTitle>
                                <Box sx={{ width: "100%", minWidth: 0, minHeight: 320 }}>
                                    <LineChart
                                        height={320}
                                        grid={{ horizontal: true, vertical: false }}
                                        xAxis={[
                                            {
                                                data: chartLabels,
                                                scaleType: "point",
                                                tickLabelStyle: AXIS_TICK_STYLE,
                                                disableLine: true,
                                                tickSize: 4,
                                            },
                                        ]}
                                        yAxis={[
                                            {
                                                id: "revenue",
                                                tickLabelStyle: AXIS_TICK_STYLE,
                                                disableLine: true,
                                                tickSize: 4,
                                            },
                                            {
                                                id: "orders",
                                                position: "right",
                                                tickLabelStyle: AXIS_TICK_STYLE,
                                                disableLine: true,
                                                tickSize: 4,
                                            },
                                        ]}
                                        series={[
                                            {
                                                id: "revenue",
                                                label: "Выручка",
                                                data: revenueSeries,
                                                yAxisId: "revenue",
                                                color: brandGreen,
                                                curve: "monotoneX",
                                                area: true,
                                                showMark: false,
                                            },
                                            {
                                                id: "orders",
                                                label: "Заказы",
                                                data: ordersSeries,
                                                yAxisId: "orders",
                                                color: alpha(
                                                    theme.palette.text.secondary,
                                                    0.55,
                                                ),
                                                curve: "monotoneX",
                                                showMark: false,
                                            },
                                        ]}
                                        margin={{ left: 4, right: 4, top: 12, bottom: 28 }}
                                        sx={chartSx}
                                        slotProps={{ tooltip: { sx: tooltipSx } }}
                                    />
                                </Box>
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 4 }}>
                            <Card
                                elevation={0}
                                sx={{ ...PANEL_SX, height: "100%" }}
                            >
                                <PanelTitle>Статусы заказов</PanelTitle>
                                {pieData.length > 0 ? (
                                    <Box sx={{ width: "100%", minWidth: 0, minHeight: 280 }}>
                                        <PieChart
                                            height={280}
                                            series={[
                                                {
                                                    data: pieData,
                                                    innerRadius: 52,
                                                    paddingAngle: 1,
                                                    cornerRadius: 3,
                                                    highlightScope: {
                                                        fade: "global",
                                                        highlight: "item",
                                                    },
                                                },
                                            ]}
                                            sx={chartSx}
                                            slotProps={{ tooltip: { sx: tooltipSx } }}
                                        />
                                    </Box>
                                ) : (
                                    <EmptyChartState message="Нет заказов за период" />
                                )}
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Card elevation={0} sx={PANEL_SX}>
                                <PanelTitle>Заказы по зонам доставки</PanelTitle>
                                {zoneRevenue.length > 0 ? (
                                    <Box sx={{ width: "100%", minWidth: 0, minHeight: 320 }}>
                                        <BarChart
                                            height={320}
                                            grid={{ horizontal: true, vertical: false }}
                                            xAxis={[
                                                {
                                                    data: zoneLabels,
                                                    scaleType: "band",
                                                    tickLabelStyle: AXIS_TICK_STYLE,
                                                    disableLine: true,
                                                    tickSize: 4,
                                                },
                                            ]}
                                            yAxis={[
                                                {
                                                    tickLabelStyle: AXIS_TICK_STYLE,
                                                    disableLine: true,
                                                    tickSize: 4,
                                                },
                                            ]}
                                            series={[
                                                {
                                                    data: zoneRevenue,
                                                    label: "Выручка",
                                                    color: brandGreen,
                                                },
                                            ]}
                                            margin={{ left: 4, right: 4, top: 12, bottom: 28 }}
                                            sx={chartSx}
                                            slotProps={{ tooltip: { sx: tooltipSx } }}
                                        />
                                    </Box>
                                ) : (
                                    <EmptyChartState message="Нет данных по зонам" />
                                )}
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Card elevation={0} sx={PANEL_SX}>
                                <PanelTitle>Загрузка по часам</PanelTitle>
                                <Box sx={{ width: "100%", minWidth: 0, minHeight: 320 }}>
                                    <LineChart
                                        height={320}
                                        grid={{ horizontal: true, vertical: false }}
                                        xAxis={[
                                            {
                                                data: hourLabels,
                                                scaleType: "point",
                                                tickLabelStyle: AXIS_TICK_STYLE,
                                                disableLine: true,
                                                tickSize: 4,
                                            },
                                        ]}
                                        yAxis={[
                                            {
                                                tickLabelStyle: AXIS_TICK_STYLE,
                                                disableLine: true,
                                                tickSize: 4,
                                            },
                                        ]}
                                        series={[
                                            {
                                                id: "hourlyOrders",
                                                label: "Заказы",
                                                data: hourOrders,
                                                color: brandGreen,
                                                curve: "monotoneX",
                                                area: true,
                                                showMark: false,
                                            },
                                        ]}
                                        margin={{ left: 4, right: 4, top: 12, bottom: 28 }}
                                        sx={chartSx}
                                        slotProps={{ tooltip: { sx: tooltipSx } }}
                                    />
                                </Box>
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <Card elevation={0} sx={{ ...PANEL_SX, height: "100%" }}>
                                <PanelTitle>Способы оплаты</PanelTitle>
                                {paymentPieData.length > 0 ? (
                                    <Box sx={{ width: "100%", minWidth: 0, minHeight: 280 }}>
                                        <PieChart
                                            height={280}
                                            series={[
                                                {
                                                    data: paymentPieData,
                                                    innerRadius: 52,
                                                    paddingAngle: 1,
                                                    cornerRadius: 3,
                                                    highlightScope: {
                                                        fade: "global",
                                                        highlight: "item",
                                                    },
                                                },
                                            ]}
                                            sx={chartSx}
                                            slotProps={{ tooltip: { sx: tooltipSx } }}
                                        />
                                    </Box>
                                ) : (
                                    <EmptyChartState message="Нет данных об оплате" />
                                )}
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 8 }}>
                            <Card elevation={0} sx={{ ...PANEL_SX, p: 0, overflow: "hidden" }}>
                                <Box sx={{ p: 3, pb: 2 }}>
                                    <PanelTitle>Топ-5 товаров</PanelTitle>
                                </Box>
                                <TableContainer sx={{ minWidth: 0 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell
                                                    sx={{
                                                        color: "text.secondary",
                                                        fontWeight: 500,
                                                        borderColor: "divider",
                                                    }}
                                                >
                                                    Название
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        color: "text.secondary",
                                                        fontWeight: 500,
                                                        borderColor: "divider",
                                                    }}
                                                >
                                                    Кол-во продаж
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        color: "text.secondary",
                                                        fontWeight: 500,
                                                        borderColor: "divider",
                                                    }}
                                                >
                                                    Выручка
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {analytics.topProducts.length > 0 ? (
                                                analytics.topProducts.map((product) => (
                                                    <TableRow key={product.name}>
                                                        <TableCell sx={{ borderColor: "divider" }}>
                                                            {product.name}
                                                        </TableCell>
                                                        <TableCell
                                                            align="right"
                                                            sx={{ borderColor: "divider" }}
                                                        >
                                                            {product.quantity}
                                                        </TableCell>
                                                        <TableCell
                                                            align="right"
                                                            sx={{ borderColor: "divider" }}
                                                        >
                                                            {formatAmd(product.revenue)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={3}
                                                        align="center"
                                                        sx={{ border: 0, py: 4 }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            Пока нет продаж
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Card>
                        </Grid>
                    </Grid>
                </Stack>
            )}
        </PageContainer>
    );
}

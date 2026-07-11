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
import { useTranslations } from "next-intl";
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
    PENDING_APPROVAL: "#78909c",
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

async function fetchAnalytics(
    days: PeriodDays,
    fallbackMessage: string,
): Promise<AdminAnalyticsResponse> {
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
                : fallbackMessage;
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
    deltaText,
    valueColor,
}: {
    title: string;
    value: string;
    deltaText?: string | null;
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
            {deltaText != null ? (
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.75,
                        color: deltaText.startsWith("-")
                            ? "error.main"
                            : "success.main",
                        fontWeight: 500,
                    }}
                >
                    {deltaText}
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
    const t = useTranslations("admin.dashboard");
    const tCommon = useTranslations("admin.common");
    const tOrder = useTranslations("order.status");
    const theme = useTheme();
    const brandGreen = theme.palette.primary.main;
    const [periodDays, setPeriodDays] = useState<PeriodDays>(14);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["admin-analytics", periodDays],
        queryFn: () => fetchAnalytics(periodDays, t("loadFailed")),
    });

    const analytics = useMemo(() => {
        const base = data ?? buildEmptyAdminAnalyticsResponse(periodDays);
        const statusLabels = {
            PENDING_APPROVAL: tOrder("pendingApproval"),
            NEW: tOrder("new"),
            COOKING: tOrder("cooking"),
            DELIVERING: tOrder("delivering"),
            DONE: tOrder("done"),
            CANCELLED: tOrder("cancelled"),
        } as const;

        return {
            ...base,
            statusDistribution: base.statusDistribution.map((slice) => ({
                ...slice,
                label: statusLabels[slice.status] ?? slice.label,
            })),
            paymentMethods: base.paymentMethods.map((slice) => ({
                ...slice,
                label:
                    slice.method === "CASH"
                        ? tCommon("cash")
                        : tCommon("cardFull"),
            })),
            exportOrders: base.exportOrders.map((order) => ({
                ...order,
                statusLabel: statusLabels[order.status] ?? order.statusLabel,
            })),
        };
    }, [data, periodDays, tCommon, tOrder]);

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

    const formatDelta = (delta: number | null) =>
        delta != null
            ? t("deltaToPrevDay", {
                  delta: `${delta > 0 ? "+" : ""}${delta.toFixed(0)}`,
              })
            : null;

    return (
        <PageContainer>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                spacing={2}
                sx={{ mb: 2 }}
            >
                <SectionTitle pageTitle>{t("title")}</SectionTitle>
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
                                [
                                    t("exportCsvHeaders.id"),
                                    t("exportCsvHeaders.date"),
                                    t("exportCsvHeaders.amount"),
                                    t("exportCsvHeaders.zone"),
                                    t("exportCsvHeaders.status"),
                                ],
                            );
                        }}
                        sx={{
                            textTransform: "none",
                            fontWeight: 500,
                            borderColor: "divider",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {t("downloadReport")}
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
                        <ToggleButton value={7}>{t("periodDays", { days: 7 })}</ToggleButton>
                        <ToggleButton value={14}>{t("periodDays", { days: 14 })}</ToggleButton>
                        <ToggleButton value={30}>{t("periodDays", { days: 30 })}</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </Stack>

            {isError ? (
                <Alert severity="error" sx={{ mb: 3, boxShadow: "none" }}>
                    {error instanceof Error
                        ? error.message
                        : t("loadError")}
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
                            title={t("revenueToday")}
                            value={formatAmd(analytics.summary.revenueToday)}
                            deltaText={formatDelta(revenueDelta)}
                        />
                        <MetricCard
                            title={t("ordersToday")}
                            value={String(analytics.summary.ordersToday)}
                            deltaText={formatDelta(ordersDelta)}
                        />
                        <MetricCard
                            title={t("avgCheck")}
                            value={formatAmd(analytics.summary.averageCheck)}
                        />
                        <MetricCard
                            title={t("activeOrders")}
                            value={String(analytics.summary.activeOrders)}
                        />
                        <MetricCard
                            title={t("discountsGiven")}
                            value={formatAmd(analytics.promoImpact)}
                            valueColor="error.main"
                        />
                    </Box>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 8 }}>
                            <Card elevation={0} sx={PANEL_SX}>
                                <PanelTitle>
                                    {t("revenueOrdersChart", {
                                        days: analytics.periodDays,
                                    })}
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
                                                label: t("revenue"),
                                                data: revenueSeries,
                                                yAxisId: "revenue",
                                                color: brandGreen,
                                                curve: "monotoneX",
                                                area: true,
                                                showMark: false,
                                            },
                                            {
                                                id: "orders",
                                                label: t("orders"),
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
                                <PanelTitle>{t("orderStatuses")}</PanelTitle>
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
                                    <EmptyChartState message={t("noOrdersInPeriod")} />
                                )}
                            </Card>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Card elevation={0} sx={PANEL_SX}>
                                <PanelTitle>{t("ordersByZone")}</PanelTitle>
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
                                                    label: t("revenue"),
                                                    color: brandGreen,
                                                },
                                            ]}
                                            margin={{ left: 4, right: 4, top: 12, bottom: 28 }}
                                            sx={chartSx}
                                            slotProps={{ tooltip: { sx: tooltipSx } }}
                                        />
                                    </Box>
                                ) : (
                                    <EmptyChartState message={t("noZoneData")} />
                                )}
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 6 }}>
                            <Card elevation={0} sx={PANEL_SX}>
                                <PanelTitle>{t("hourlyLoad")}</PanelTitle>
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
                                                label: t("orders"),
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
                                <PanelTitle>{t("paymentMethods")}</PanelTitle>
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
                                    <EmptyChartState message={t("noPaymentData")} />
                                )}
                            </Card>
                        </Grid>

                        <Grid size={{ xs: 12, lg: 8 }}>
                            <Card elevation={0} sx={{ ...PANEL_SX, p: 0, overflow: "hidden" }}>
                                <Box sx={{ p: 3, pb: 2 }}>
                                    <PanelTitle>{t("topProducts")}</PanelTitle>
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
                                                    {tCommon("name")}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        color: "text.secondary",
                                                        fontWeight: 500,
                                                        borderColor: "divider",
                                                    }}
                                                >
                                                    {t("salesCount")}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        color: "text.secondary",
                                                        fontWeight: 500,
                                                        borderColor: "divider",
                                                    }}
                                                >
                                                    {t("revenue")}
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
                                                            {t("noSalesYet")}
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

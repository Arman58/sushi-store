import SearchIcon from "@mui/icons-material/Search";
import {
    Box,
    Button,
    Chip,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { getTranslations } from "next-intl/server";

import { resolveAdminLocale } from "@/lib/admin-locale";

import {
    buildExportHref,
    buildFilterHref,
    buildPageHref,
    buildSortHref,
    formatDate,
    mapDeliveryLabel,
    mapPaymentLabel,
    mapStatusLabel,
    type OrderDisplayLabels,
    renderFilterChip,
} from "./orders-page-helpers";
import {
    type DateRangeFilter,
    type DeliveryFilter,
    getOrders,
    type PaymentFilter,
    type SortDirection,
    type SortField,
    type StatusFilter,
} from "./orders-query";
import { OrdersTable } from "./orders-table";

const BASE_PATH = "/admin/orders";

export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
    searchParams: Promise<{
        sort?: string;
        dir?: string;
        delivery?: string;
        payment?: string;
        dateRange?: string;
        q?: string;
        status?: string;
        page?: string;
    }>;
};

export default async function AdminOrdersPage({
                                                  searchParams,
                                              }: AdminOrdersPageProps) {
    const sp = await searchParams;
    const locale = await resolveAdminLocale();
    const t = await getTranslations({ locale, namespace: "admin.orders" });
    const tCommon = await getTranslations({ locale, namespace: "admin.common" });
    const tOrder = await getTranslations({ locale, namespace: "order" });
    const tNav = await getTranslations({ locale, namespace: "nav" });

    const orderLabels: OrderDisplayLabels = {
        paymentCash: tOrder("payment.cash"),
        paymentCard: tOrder("payment.card"),
        deliveryDelivery: tCommon("delivery"),
        deliveryPickup: tCommon("pickup"),
        status: {
            NEW: tOrder("status.new"),
            COOKING: tOrder("status.cooking"),
            DELIVERING: tOrder("status.delivering"),
            DONE: tOrder("status.done"),
            CANCELLED: tOrder("status.cancelled"),
        },
    };

    const formatAmount = (value: number) =>
        `${value.toLocaleString(locale)} ֏`;

    const columnLabels = {
        id: tCommon("id"),
        date: tCommon("date"),
        customerName: t("customerName"),
        amount: t("amount"),
        status: t("statusLabel"),
        payment: t("paymentLabel"),
        emptyFiltered: t("emptyFiltered"),
    };

    // сортировка
    const sortFieldParam = (sp.sort as SortField) ?? "date";
    const sortDirParam =
        sp.dir === "asc" || sp.dir === "desc"
            ? (sp.dir as SortDirection)
            : "desc";

    const sortField: SortField =
        sortFieldParam === "id" ||
        sortFieldParam === "name" ||
        sortFieldParam === "total" ||
        sortFieldParam === "date"
            ? sortFieldParam
            : "date";

    const sortDir: SortDirection = sortDirParam;

    // фильтры
    const deliveryParam = (sp.delivery as DeliveryFilter) ?? "all";
    const paymentParam = (sp.payment as PaymentFilter) ?? "all";
    const dateRangeParam = (sp.dateRange as DateRangeFilter) ?? "all";
    const searchQueryRaw = sp.q ?? "";
    const searchQuery = searchQueryRaw.trim();

    const deliveryFilter: DeliveryFilter =
        deliveryParam === "delivery" || deliveryParam === "pickup"
            ? deliveryParam
            : "all";

    const paymentFilter: PaymentFilter =
        paymentParam === "cash" || paymentParam === "card"
            ? paymentParam
            : "all";

    const statusParam = (sp.status as StatusFilter) ?? "all";
    const statusFilter: StatusFilter =
        statusParam === "new" ||
        statusParam === "in_progress" ||
        statusParam === "done" ||
        statusParam === "cancelled"
            ? statusParam
            : "all";

    const dateRangeFilter: DateRangeFilter =
        dateRangeParam === "today" ||
        dateRangeParam === "7d" ||
        dateRangeParam === "30d"
            ? dateRangeParam
            : "all";

    const filtersApplied =
        deliveryFilter !== "all" ||
        paymentFilter !== "all" ||
        dateRangeFilter !== "all" ||
        statusFilter !== "all" ||
        searchQuery.length > 0;

    const baseSearchParams: Record<string, string | undefined> = {
        sort: sp.sort,
        dir: sp.dir,
        delivery: sp.delivery,
        payment: sp.payment,
        dateRange: dateRangeFilter !== "all" ? dateRangeFilter : undefined,
        q: searchQuery.length > 0 ? searchQuery : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
    };

    const orders = await getOrders(
        sortField,
        sortDir,
        deliveryFilter,
        paymentFilter,
        statusFilter,
    );

    const now = new Date();

    const filteredByDate = orders.filter((order) => {
        if (dateRangeFilter === "all") return true;

        const createdAt = order.createdAt;
        const msInDay = 24 * 60 * 60 * 1000;

        if (dateRangeFilter === "today") {
            const startOfToday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
            );
            return createdAt >= startOfToday;
        }

        if (dateRangeFilter === "7d") {
            const from = new Date(now.getTime() - 7 * msInDay);
            return createdAt >= from;
        }

        if (dateRangeFilter === "30d") {
            const from = new Date(now.getTime() - 30 * msInDay);
            return createdAt >= from;
        }

        return true;
    });

    const filteredOrders = filteredByDate.filter((order) => {
        if (!searchQuery) return true;

        const q = searchQuery.toLowerCase();

        return (
            order.name.toLowerCase().includes(q) ||
            order.phone.toLowerCase().includes(q) ||
            String(order.id).includes(q)
        );
    });

    const totalCount = orders.length;
    const filteredCount = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce(
        (sum, order) => sum + order.totalPrice,
        0,
    );
    const pageSize = 25;
    const requestedPage = parseInt(sp.page ?? "1", 10);
    const currentPage = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedOrders = filteredOrders.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );
    const exportHref = buildExportHref(baseSearchParams);
    const deliveryCount = filteredOrders.filter(
        (order) => order.delivery === "DELIVERY",
    ).length;
    const pickupCount = filteredOrders.filter(
        (order) => order.delivery === "PICKUP",
    ).length;
    const tableOrders = paginatedOrders.map((order) => ({
        id: order.id,
        createdAtFormatted: formatDate(order.createdAt, locale),
        name: order.name,
        phone: order.phone,
        deliveryLabel: mapDeliveryLabel(order.delivery, orderLabels),
        payment: order.payment,
        paymentLabel: mapPaymentLabel(order.payment, orderLabels),
        statusLabel: mapStatusLabel(order.status, orderLabels),
        status: order.status,
        address: order.address ?? "-",
        subtotalBeforeDiscount: order.subtotalBeforeDiscount,
        discountAmount: order.discountAmount,
        deliveryPrice: order.deliveryPrice,
        totalPrice: order.totalPrice,
        items: order.items,
        comment: order.comment,
        changeFrom: order.changeFrom,
        scheduledFor: order.scheduledFor?.toISOString() ?? null,
        estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString() ?? null,
    }));

    return (
        <Box>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        mb: 2,
                    }}
                >
                    <Typography variant="h5" fontWeight={800}>
                        {t("title")}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ maxWidth: 520 }}
                    >
                        {t("subtitle")}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                            href={exportHref}
                            component="a"
                            variant="outlined"
                            size="small"
                        >
                            {t("exportCsv")}
                        </Button>
                        <Button
                            href={BASE_PATH}
                            component="a"
                            variant="text"
                            size="small"
                        >
                            {t("resetFilters")}
                        </Button>
                    </Stack>
                </Box>

                {totalCount === 0 && !filtersApplied ? (
                    <Typography color="text.secondary">
                        {t("noOrdersYet")}
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            mt: 2,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2.5,
                        }}
                    >
                        {/* Верхняя панель: метрики + фильтры + поиск */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                border: "1px solid var(--ew-border)",
                                bgcolor: "var(--ew-surface-hi)",
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                justifyContent: "space-between",
                                gap: 2,
                            }}
                        >
                            {/* Метрики */}
                            <Stack spacing={1.5}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        letterSpacing: 0.2,
                                    }}
                                >
                                    {t("totalOrders", { count: totalCount })}
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    <Chip
                                        label={t("shownCount", { count: filteredCount })}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            bgcolor: "rgba(148,163,184,0.16)",
                                        }}
                                    />
                                    <Chip
                                        label={t("revenueChip", {
                                            amount: formatAmount(totalRevenue),
                                        })}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            fontWeight: 600,
                                            bgcolor: "rgba(34,197,94,0.10)",
                                        }}
                                    />
                                    <Chip
                                        label={t("avgCheckChip", {
                                            amount: formatAmount(
                                                filteredCount > 0
                                                    ? Math.round(
                                                          totalRevenue /
                                                              filteredCount,
                                                      )
                                                    : 0,
                                            ),
                                        })}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            bgcolor: "rgba(59,130,246,0.10)",
                                        }}
                                    />
                                    <Chip
                                        label={t("deliveriesCount", {
                                            count: deliveryCount,
                                        })}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            bgcolor: "rgba(56,189,248,0.12)",
                                        }}
                                    />
                                    <Chip
                                        label={t("pickupCount", {
                                            count: pickupCount,
                                        })}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            bgcolor: "rgba(134,239,172,0.18)",
                                        }}
                                    />
                                </Stack>
                            </Stack>

                            {/* Правый блок: период + поиск */}
                            <Stack
                                spacing={1.5}
                                sx={{
                                    width: { xs: "100%", md: "auto" },
                                    alignItems: { xs: "stretch", md: "flex-end" },
                                }}
                            >
                                {/* Период */}
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                    justifyContent={{ xs: "flex-start", md: "flex-end" }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            textTransform: "uppercase",
                                            letterSpacing: 0.6,
                                            mt: 0.5,
                                        }}
                                    >
                                        {t("period")}
                                    </Typography>
                                    {renderFilterChip(
                                        tCommon("all"),
                                        buildFilterHref(baseSearchParams, {
                                            dateRange: "all",
                                        }),
                                        dateRangeFilter === "all",
                                    )}
                                    {renderFilterChip(
                                        tCommon("today"),
                                        buildFilterHref(baseSearchParams, {
                                            dateRange: "today",
                                        }),
                                        dateRangeFilter === "today",
                                    )}
                                    {renderFilterChip(
                                        t("last7Days"),
                                        buildFilterHref(baseSearchParams, {
                                            dateRange: "7d",
                                        }),
                                        dateRangeFilter === "7d",
                                    )}
                                    {renderFilterChip(
                                        t("last30Days"),
                                        buildFilterHref(baseSearchParams, {
                                            dateRange: "30d",
                                        }),
                                        dateRangeFilter === "30d",
                                    )}
                                </Stack>

                                {/* Поиск */}
                                <Box sx={{ width: "100%", minWidth: 260, maxWidth: 320 }}>
                                    <form method="GET">
                                        <TextField
                                            name="q"
                                            size="small"
                                            fullWidth
                                            placeholder={t("searchPlaceholder")}
                                            defaultValue={searchQuery}
                                            InputProps={
                                                {
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <SearchIcon
                                                                sx={{
                                                                    fontSize: 18,
                                                                    color: "text.secondary",
                                                                }}
                                                            />
                                                        </InputAdornment>
                                                    ),
                                                }
                                            }
                                        />
                                        {/* переносим остальные параметры в форму */}
                                        {sp.sort && (
                                            <input
                                                type="hidden"
                                                name="sort"
                                                value={sp.sort}
                                            />
                                        )}
                                        {sp.dir && (
                                            <input
                                                type="hidden"
                                                name="dir"
                                                value={sp.dir}
                                            />
                                        )}
                                        {sp.delivery && (
                                            <input
                                                type="hidden"
                                                name="delivery"
                                                value={sp.delivery}
                                            />
                                        )}
                                        {sp.payment && (
                                            <input
                                                type="hidden"
                                                name="payment"
                                                value={sp.payment}
                                            />
                                        )}
                                        {dateRangeFilter !== "all" && (
                                            <input
                                                type="hidden"
                                                name="dateRange"
                                                value={dateRangeFilter}
                                            />
                                        )}
                                    </form>
                                </Box>
                            </Stack>
                        </Paper>

                        {/* Фильтры доставка/оплата */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                border: "1px solid var(--ew-border)",
                                bgcolor: "var(--ew-surface-hi)",
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                gap: 1.5,
                                justifyContent: "space-between",
                            }}
                        >
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        textTransform: "uppercase",
                                        letterSpacing: 0.6,
                                        mt: 0.5,
                                    }}
                                >
                                    {tCommon("delivery")}
                                </Typography>
                                {renderFilterChip(
                                    tCommon("all"),
                                    buildFilterHref(baseSearchParams, {
                                        delivery: "all",
                                    }),
                                    deliveryFilter === "all",
                                )}
                                {renderFilterChip(
                                    tCommon("delivery"),
                                    buildFilterHref(baseSearchParams, {
                                        delivery: "delivery",
                                    }),
                                    deliveryFilter === "delivery",
                                )}
                                {renderFilterChip(
                                    tCommon("pickup"),
                                    buildFilterHref(baseSearchParams, {
                                        delivery: "pickup",
                                    }),
                                    deliveryFilter === "pickup",
                                )}
                            </Stack>

                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        textTransform: "uppercase",
                                        letterSpacing: 0.6,
                                        mt: 0.5,
                                    }}
                                >
                                    {t("paymentLabel")}
                                </Typography>
                                {renderFilterChip(
                                    tCommon("all"),
                                    buildFilterHref(baseSearchParams, {
                                        payment: "all",
                                    }),
                                    paymentFilter === "all",
                                )}
                                {renderFilterChip(
                                    tCommon("cash"),
                                    buildFilterHref(baseSearchParams, {
                                        payment: "cash",
                                    }),
                                    paymentFilter === "cash",
                                )}
                                {renderFilterChip(
                                    tCommon("card"),
                                    buildFilterHref(baseSearchParams, {
                                        payment: "card",
                                    }),
                                    paymentFilter === "card",
                                )}
                            </Stack>

                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        textTransform: "uppercase",
                                        letterSpacing: 0.6,
                                        mt: 0.5,
                                    }}
                                >
                                    {t("statusLabel")}
                                </Typography>
                                {renderFilterChip(
                                    tCommon("all"),
                                    buildFilterHref(baseSearchParams, {
                                        status: "all",
                                        page: undefined,
                                    }),
                                    statusFilter === "all",
                                )}
                                {renderFilterChip(
                                    t("statusNew"),
                                    buildFilterHref(baseSearchParams, {
                                        status: "new",
                                        page: undefined,
                                    }),
                                    statusFilter === "new",
                                )}
                                {renderFilterChip(
                                    t("statusInProgress"),
                                    buildFilterHref(baseSearchParams, {
                                        status: "in_progress",
                                        page: undefined,
                                    }),
                                    statusFilter === "in_progress",
                                )}
                                {renderFilterChip(
                                    t("statusReady"),
                                    buildFilterHref(baseSearchParams, {
                                        status: "done",
                                        page: undefined,
                                    }),
                                    statusFilter === "done",
                                )}
                                {renderFilterChip(
                                    t("statusCancelled"),
                                    buildFilterHref(baseSearchParams, {
                                        status: "cancelled",
                                        page: undefined,
                                    }),
                                    statusFilter === "cancelled",
                                )}
                            </Stack>
                        </Paper>

                        <OrdersTable
                            orders={tableOrders}
                            searchQuery={searchQuery}
                            sortField={sortField}
                            sortDir={sortDir}
                            empty={filteredOrders.length === 0}
                            columnLabels={columnLabels}
                            buildSortHref={(column) =>
                                buildSortHref(
                                    baseSearchParams,
                                    column,
                                    sortField,
                                    sortDir,
                                )
                            }
                        />

                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mt: 2,
                                flexWrap: "wrap",
                                gap: 1,
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {t("pageOf", {
                                    page: safePage,
                                    totalPages,
                                })}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    component="a"
                                    href={buildPageHref(
                                        baseSearchParams,
                                        Math.max(1, safePage - 1),
                                    )}
                                    variant="outlined"
                                    size="small"
                                    disabled={safePage <= 1}
                                >
                                    {tNav("back")}
                                </Button>
                                <Button
                                    component="a"
                                    href={buildPageHref(
                                        baseSearchParams,
                                        Math.min(totalPages, safePage + 1),
                                    )}
                                    variant="outlined"
                                    size="small"
                                    disabled={safePage >= totalPages}
                                >
                                    {tNav("forward")}
                                </Button>
                            </Stack>
                        </Box>
                    </Box>
                )}
        </Box>
    );
}

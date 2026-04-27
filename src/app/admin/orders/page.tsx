import SearchIcon from "@mui/icons-material/Search";
import {
    Box,
    Button,
    Chip,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {
    DeliveryType,
    OrderStatus,
    PaymentMethod,
    Prisma,
} from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PageContainer, SectionTitle } from "@/shared/ui";

import { OrderRow } from "./order-row";

type SortField = "date" | "total" | "name" | "id";
type SortDirection = "asc" | "desc";

type DeliveryFilter = "all" | "delivery" | "pickup";
type PaymentFilter = "all" | "cash" | "card";
type DateRangeFilter = "all" | "today" | "7d" | "30d";
type StatusFilter = "all" | "new" | "in_progress" | "done" | "cancelled";

const BASE_PATH = "/admin/orders";

async function getOrders(
    sortField: SortField,
    sortDir: SortDirection,
    deliveryFilter: DeliveryFilter,
    paymentFilter: PaymentFilter,
    statusFilter: StatusFilter,
): Promise<
    Prisma.OrderGetPayload<{
        include: { items: true };
    }>[]
> {
    let orderBy: Prisma.OrderOrderByWithRelationInput;

    switch (sortField) {
        case "id":
            orderBy = { id: sortDir };
            break;
        case "name":
            orderBy = { name: sortDir };
            break;
        case "total":
            orderBy = { totalPrice: sortDir };
            break;
        case "date":
        default:
            orderBy = { createdAt: sortDir };
            break;
    }

    const where: Prisma.OrderWhereInput = {};

    if (deliveryFilter === "delivery") {
        where.delivery = DeliveryType.DELIVERY;
    } else if (deliveryFilter === "pickup") {
        where.delivery = DeliveryType.PICKUP;
    }

    if (paymentFilter === "cash") {
        where.payment = PaymentMethod.CASH;
    } else if (paymentFilter === "card") {
        where.payment = PaymentMethod.CARD;
    }

    if (statusFilter === "new") {
        where.status = OrderStatus.NEW;
    } else if (statusFilter === "in_progress") {
        where.status = OrderStatus.IN_PROGRESS;
    } else if (statusFilter === "done") {
        where.status = OrderStatus.DONE;
    } else if (statusFilter === "cancelled") {
        where.status = OrderStatus.CANCELLED;
    }

    const orders = await prisma.order.findMany({
        where,
        orderBy,
        include: {
            items: true,
        },
    });

    return orders;
}

// фиксируем локаль и таймзону
const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Yerevan",
});

function formatDate(date: Date): string {
    return dateFormatter.format(date);
}

function mapPaymentLabel(payment: PaymentMethod): string {
    switch (payment) {
        case "CASH":
            return "Наличными";
        case "CARD":
            return "Картой";
        default:
            return payment;
    }
}

function mapDeliveryLabel(delivery: DeliveryType): string {
    switch (delivery) {
        case "DELIVERY":
            return "Доставка";
        case "PICKUP":
            return "Самовывоз";
        default:
            return delivery;
    }
}

function mapStatusLabel(status: string): string {
    switch (status) {
        case "NEW":
            return "Новый";
        case "IN_PROGRESS":
            return "В работе";
        case "DONE":
            return "Выполнен";
        case "CANCELLED":
            return "Отменён";
        default:
            return status;
    }
}

function getNextSortDir(
    currentField: SortField,
    currentDir: SortDirection,
    column: SortField,
): SortDirection {
    if (currentField === column) {
        return currentDir === "desc" ? "asc" : "desc";
    }
    return "desc";
}

function buildSortHref(
    searchParams: Record<string, string | undefined>,
    column: SortField,
    currentField: SortField,
    currentDir: SortDirection,
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    const nextDir = getNextSortDir(currentField, currentDir, column);

    params.set("sort", column);
    params.set("dir", nextDir);

    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

function buildFilterHref(
    searchParams: Record<string, string | undefined>,
    updates: Record<string, string | undefined>,
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
    }

    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

function buildExportHref(searchParams: Record<string, string | undefined>): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    const query = params.toString();
    return query ? `/admin/orders/export?${query}` : "/admin/orders/export";
}

function buildPageHref(
    searchParams: Record<string, string | undefined>,
    page: number,
): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        if (value) params.set(key, value);
    }

    params.set("page", String(page));

    const query = params.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

function renderSortLabel(
    label: string,
    column: SortField,
    currentField: SortField,
    currentDir: SortDirection,
    href: string,
) {
    const isActive = currentField === column;
    const arrow = !isActive ? "" : currentDir === "asc" ? "▲" : "▼";

    return (
        <Link
            href={href}
            style={{ textDecoration: "none", color: "inherit" }}
            scroll={false}
        >
            <Box
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    "&:hover": {
                        color: "warning.main",
                    },
                }}
            >
                <span>{label}</span>
                {arrow && (
                    <Box component="span" sx={{ fontSize: 10, lineHeight: 1 }}>
                        {arrow}
                    </Box>
                )}
            </Box>
        </Link>
    );
}

function renderFilterChip(
    label: string,
    href: string,
    active: boolean,
) {
    return (
        <a href={href} style={{ textDecoration: "none" }}>
            <Chip
                component="span"
                clickable
                label={label}
                size="small"
                sx={{
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    bgcolor: active
                        ? "rgba(249,115,22,0.16)"
                        : "rgba(148,163,184,0.10)",
                    color: active ? "warning.main" : "text.secondary",
                    textDecoration: "none",
                    "&:hover": {
                        bgcolor: active
                            ? "rgba(249,115,22,0.22)"
                            : "rgba(148,163,184,0.18)",
                    },
                }}
            />
        </a>
    );
}

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
        createdAtFormatted: formatDate(order.createdAt),
        name: order.name,
        phone: order.phone,
        deliveryLabel: mapDeliveryLabel(order.delivery),
        paymentLabel: mapPaymentLabel(order.payment),
        statusLabel: mapStatusLabel(order.status),
        status: order.status,
        address: order.address ?? "—",
        totalPrice: order.totalPrice,
        items: order.items,
        comment: order.comment,
    }));

    return (
        <main>
            <PageContainer>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        mb: 2,
                    }}
                >
                    <SectionTitle>Заказы (admin)</SectionTitle>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ maxWidth: 520 }}
                    >
                        Здесь вы видите все заказы East-West: можно быстро
                        отфильтровать по периоду, способу доставки и оплате,
                        а также найти нужного клиента по имени или телефону.
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                            href={exportHref}
                            component="a"
                            variant="outlined"
                            size="small"
                        >
                            Экспорт CSV
                        </Button>
                        <Button
                            href={BASE_PATH}
                            component="a"
                            variant="text"
                            size="small"
                        >
                            Сбросить фильтры
                        </Button>
                    </Stack>
                </Box>

                {totalCount === 0 && !filtersApplied ? (
                    <Typography color="text.secondary">
                        Заказов пока нет.
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
                                border: "1px solid rgba(148,163,184,0.35)",
                                bgcolor: "rgba(248,250,252,0.96)",
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
                                    Всего заказов: {totalCount}
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    <Chip
                                        label={`Показано: ${filteredCount}`}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            bgcolor: "rgba(148,163,184,0.16)",
                                        }}
                                    />
                                    <Chip
                                        label={`Выручка: ${totalRevenue.toLocaleString(
                                            "ru-RU",
                                        )} ֏`}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            fontWeight: 600,
                                            bgcolor: "rgba(34,197,94,0.10)",
                                        }}
                                    />
                                    <Chip
                                        label={`Средний чек: ${
                                            filteredCount > 0
                                                ? Math.round(
                                                    totalRevenue /
                                                    filteredCount,
                                                ).toLocaleString("ru-RU")
                                                : 0
                                        } ֏`}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            bgcolor: "rgba(59,130,246,0.10)",
                                        }}
                                    />
                                    <Chip
                                        label={`Доставки: ${deliveryCount}`}
                                        size="small"
                                        sx={{
                                            borderRadius: 999,
                                            bgcolor: "rgba(56,189,248,0.12)",
                                        }}
                                    />
                                    <Chip
                                        label={`Самовывоз: ${pickupCount}`}
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
                                        Период
                                    </Typography>
                                    {renderFilterChip(
                                        "Все",
                                        buildFilterHref(baseSearchParams, {
                                            dateRange: "all",
                                        }),
                                        dateRangeFilter === "all",
                                    )}
                                    {renderFilterChip(
                                        "Сегодня",
                                        buildFilterHref(baseSearchParams, {
                                            dateRange: "today",
                                        }),
                                        dateRangeFilter === "today",
                                    )}
                                    {renderFilterChip(
                                        "7 дней",
                                        buildFilterHref(baseSearchParams, {
                                            dateRange: "7d",
                                        }),
                                        dateRangeFilter === "7d",
                                    )}
                                    {renderFilterChip(
                                        "30 дней",
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
                                            placeholder="Поиск: имя, телефон, ID…"
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
                                border: "1px solid rgba(226,232,240,0.9)",
                                bgcolor: "background.paper",
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
                                    Доставка
                                </Typography>
                                {renderFilterChip(
                                    "Все",
                                    buildFilterHref(baseSearchParams, {
                                        delivery: "all",
                                    }),
                                    deliveryFilter === "all",
                                )}
                                {renderFilterChip(
                                    "Доставка",
                                    buildFilterHref(baseSearchParams, {
                                        delivery: "delivery",
                                    }),
                                    deliveryFilter === "delivery",
                                )}
                                {renderFilterChip(
                                    "Самовывоз",
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
                                    Оплата
                                </Typography>
                                {renderFilterChip(
                                    "Все",
                                    buildFilterHref(baseSearchParams, {
                                        payment: "all",
                                    }),
                                    paymentFilter === "all",
                                )}
                                {renderFilterChip(
                                    "Нал",
                                    buildFilterHref(baseSearchParams, {
                                        payment: "cash",
                                    }),
                                    paymentFilter === "cash",
                                )}
                                {renderFilterChip(
                                    "Карта",
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
                                    Статус
                                </Typography>
                                {renderFilterChip(
                                    "Все",
                                    buildFilterHref(baseSearchParams, {
                                        status: "all",
                                        page: undefined,
                                    }),
                                    statusFilter === "all",
                                )}
                                {renderFilterChip(
                                    "Новые",
                                    buildFilterHref(baseSearchParams, {
                                        status: "new",
                                        page: undefined,
                                    }),
                                    statusFilter === "new",
                                )}
                                {renderFilterChip(
                                    "В работе",
                                    buildFilterHref(baseSearchParams, {
                                        status: "in_progress",
                                        page: undefined,
                                    }),
                                    statusFilter === "in_progress",
                                )}
                                {renderFilterChip(
                                    "Готово",
                                    buildFilterHref(baseSearchParams, {
                                        status: "done",
                                        page: undefined,
                                    }),
                                    statusFilter === "done",
                                )}
                                {renderFilterChip(
                                    "Отменён",
                                    buildFilterHref(baseSearchParams, {
                                        status: "cancelled",
                                        page: undefined,
                                    }),
                                    statusFilter === "cancelled",
                                )}
                            </Stack>
                        </Paper>

                        {/* Таблица заказов */}
                        <TableContainer
                            component={Paper}
                            sx={{
                                mt: 1,
                                boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
                                border: "1px solid rgba(148,163,184,0.35)",
                                borderRadius: 0,
                                overflow: "auto",
                                minHeight: 360,
                                background:
                                    "radial-gradient(circle at top, rgba(248,250,252,0.9), rgba(241,245,249,0.95))",
                            }}
                        >
                            <Table
                                size="small"
                                sx={{
                                    borderCollapse: "separate",
                                    borderSpacing: 0,
                                    minWidth: 980,
                                }}
                            >
                                <TableHead>
                                    <TableRow
                                        sx={{
                                            bgcolor: "rgba(248,250,252,0.96)",
                                            "& > *": {
                                                fontSize: 11,
                                                fontWeight: 700,
                                                letterSpacing: 0.12,
                                                textTransform: "uppercase",
                                                color: "text.secondary",
                                                borderBottom:
                                                    "1px solid rgba(148,163,184,0.25)",
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ width: 56 }}>
                                            {renderSortLabel(
                                                "ID",
                                                "id",
                                                sortField,
                                                sortDir,
                                                buildSortHref(
                                                    baseSearchParams,
                                                    "id",
                                                    sortField,
                                                    sortDir,
                                                ),
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {renderSortLabel(
                                                "Дата",
                                                "date",
                                                sortField,
                                                sortDir,
                                                buildSortHref(
                                                    baseSearchParams,
                                                    "date",
                                                    sortField,
                                                    sortDir,
                                                ),
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {renderSortLabel(
                                                "Клиент",
                                                "name",
                                                sortField,
                                                sortDir,
                                                buildSortHref(
                                                    baseSearchParams,
                                                    "name",
                                                    sortField,
                                                    sortDir,
                                                ),
                                            )}
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                display: {
                                                    xs: "none",
                                                    md: "table-cell",
                                                },
                                            }}
                                        >
                                            Телефон
                                        </TableCell>

                                        <TableCell>Доставка</TableCell>

                                        <TableCell>Статус</TableCell>

                                        <TableCell
                                            sx={{
                                                display: {
                                                    xs: "none",
                                                    md: "table-cell",
                                                },
                                            }}
                                        >
                                            Адрес
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                display: {
                                                    xs: "none",
                                                    md: "table-cell",
                                                },
                                            }}
                                        >
                                            Оплата
                                        </TableCell>

                                        <TableCell align="right">
                                            {renderSortLabel(
                                                "Сумма",
                                                "total",
                                                sortField,
                                                sortDir,
                                                buildSortHref(
                                                    baseSearchParams,
                                                    "total",
                                                    sortField,
                                                    sortDir,
                                                ),
                                            )}
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                display: {
                                                    xs: "none",
                                                    md: "table-cell",
                                                },
                                            }}
                                        >
                                            Позиции
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {filteredOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={10}
                                                sx={{
                                                    py: 6,
                                                    textAlign: "center",
                                                }}
                                            >
                                                <Typography color="text.secondary">
                                                    Нет заказов по текущим
                                                    фильтрам.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tableOrders.map((order) => (
                                            <OrderRow
                                                key={order.id}
                                                order={order}
                                                searchQuery={searchQuery}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

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
                                Страница {safePage} из {totalPages}
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
                                    Назад
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
                                    Вперёд
                                </Button>
                            </Stack>
                        </Box>
                    </Box>
                )}
            </PageContainer>
        </main>
    );
}

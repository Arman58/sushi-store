import {
    Box,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import Link from "next/link";

import { OrderRow } from "./order-row";

const TABLE_HEAD_CELL_SX = {
    px: 2,
    py: 1.5,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.12,
    textTransform: "uppercase" as const,
    color: "text.secondary",
    borderBottom: "1px solid",
    borderColor: "divider",
};

export type OrdersTableOrder = {
    id: number;
    createdAtFormatted: string;
    name: string;
    phone: string;
    deliveryLabel: string;
    payment: string;
    paymentLabel: string;
    statusLabel: string;
    status: string;
    address: string;
    subtotalBeforeDiscount: number;
    discountAmount: number;
    deliveryPrice: number;
    totalPrice: number;
    items: Array<{
        id: number;
        productId?: number | null;
        name: string;
        price: number;
        quantity: number;
        selectedModifiers?: unknown;
    }>;
    comment?: string | null;
    estimatedDeliveryAt?: string | null;
};

type SortField = "date" | "total" | "name" | "id";
type SortDirection = "asc" | "desc";

type OrdersTableProps = {
    orders: OrdersTableOrder[];
    searchQuery: string;
    sortField: SortField;
    sortDir: SortDirection;
    buildSortHref: (column: SortField) => string;
    empty: boolean;
};

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
                    "&:hover": { color: "primary.main" },
                }}
            >
                <span>{label}</span>
                {arrow ? (
                    <Box component="span" sx={{ fontSize: 10, lineHeight: 1 }}>
                        {arrow}
                    </Box>
                ) : null}
            </Box>
        </Link>
    );
}

export function OrdersTable({
    orders,
    searchQuery,
    sortField,
    sortDir,
    buildSortHref,
    empty,
}: OrdersTableProps) {
    if (empty) {
        return (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                Нет заказов по текущим фильтрам.
            </Typography>
        );
    }

    return (
        <>
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    mt: 1,
                    display: { xs: "none", md: "block" },
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "auto",
                    minHeight: 360,
                    bgcolor: "background.paper",
                }}
            >
                <Table
                    size="medium"
                    sx={{
                        minWidth: 760,
                        tableLayout: "fixed",
                        "& .MuiTableCell-root": {
                            verticalAlign: "middle",
                        },
                    }}
                >
                    <TableHead>
                        <TableRow sx={{ bgcolor: "action.hover" }}>
                            <TableCell sx={{ ...TABLE_HEAD_CELL_SX, width: 88 }}>
                                {renderSortLabel(
                                    "ID",
                                    "id",
                                    sortField,
                                    sortDir,
                                    buildSortHref("id"),
                                )}
                            </TableCell>

                            <TableCell sx={{ ...TABLE_HEAD_CELL_SX, width: 132 }}>
                                {renderSortLabel(
                                    "Дата",
                                    "date",
                                    sortField,
                                    sortDir,
                                    buildSortHref("date"),
                                )}
                            </TableCell>

                            <TableCell sx={{ ...TABLE_HEAD_CELL_SX, width: "28%" }}>
                                {renderSortLabel(
                                    "Имя клиента",
                                    "name",
                                    sortField,
                                    sortDir,
                                    buildSortHref("name"),
                                )}
                            </TableCell>

                            <TableCell
                                align="right"
                                sx={{ ...TABLE_HEAD_CELL_SX, width: 124 }}
                            >
                                {renderSortLabel(
                                    "Сумма",
                                    "total",
                                    sortField,
                                    sortDir,
                                    buildSortHref("total"),
                                )}
                            </TableCell>

                            <TableCell sx={{ ...TABLE_HEAD_CELL_SX, width: 132 }}>
                                Статус
                            </TableCell>

                            <TableCell sx={{ ...TABLE_HEAD_CELL_SX, width: 116 }}>
                                Оплата
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {orders.map((order) => (
                            <OrderRow
                                key={order.id}
                                order={order}
                                searchQuery={searchQuery}
                                variant="table"
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Stack
                spacing={1.5}
                sx={{
                    mt: 1,
                    display: { xs: "flex", md: "none" },
                }}
            >
                {orders.map((order) => (
                    <OrderRow
                        key={order.id}
                        order={order}
                        searchQuery={searchQuery}
                        variant="card"
                    />
                ))}
            </Stack>
        </>
    );
}

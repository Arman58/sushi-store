import {
    DeliveryType,
    OrderStatus,
    PaymentMethod,
    Prisma,
} from "@prisma/client";

import { STORE_TIMEZONE } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { getStartOfDayInTimezone } from "@/lib/store-timezone";

export type SortField = "date" | "total" | "name" | "id";
export type SortDirection = "asc" | "desc";

export type DeliveryFilter = "all" | "delivery" | "pickup";
export type PaymentFilter = "all" | "cash" | "card";
export type DateRangeFilter = "all" | "today" | "7d" | "30d";
export type StatusFilter = "all" | "new" | "in_progress" | "done" | "cancelled";

export type OrderFilters = {
    delivery: DeliveryFilter;
    payment: PaymentFilter;
    status: StatusFilter;
    dateRange: DateRangeFilter;
    /** Поиск по имени, телефону или номеру заказа. */
    q: string;
};

export type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Номер заказа - Int4; более длинные числа в запрос не передаём (иначе Prisma падает). */
const MAX_ORDER_ID_DIGITS = 9;

export function buildOrderBy(
    sortField: SortField,
    sortDir: SortDirection,
): Prisma.OrderOrderByWithRelationInput[] {
    const primary: Prisma.OrderOrderByWithRelationInput =
        sortField === "id"
            ? { id: sortDir }
            : sortField === "name"
              ? { name: sortDir }
              : sortField === "total"
                ? { totalPrice: sortDir }
                : { createdAt: sortDir };

    // id - вторым ключом: при равных значениях (одинаковое имя/сумма) порядок должен быть
    // детерминированным, иначе при постраничной выборке строки повторяются и теряются.
    return sortField === "id" ? [primary] : [primary, { id: sortDir }];
}

/** Условия без даты и поиска: по ним считается "всего заказов" в шапке. */
export function buildBaseWhere(
    filters: Pick<OrderFilters, "delivery" | "payment" | "status">,
): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    if (filters.delivery === "delivery") where.delivery = DeliveryType.DELIVERY;
    else if (filters.delivery === "pickup") where.delivery = DeliveryType.PICKUP;

    if (filters.payment === "cash") where.payment = PaymentMethod.CASH;
    else if (filters.payment === "card") where.payment = PaymentMethod.CARD;

    if (filters.status === "new") {
        where.status = { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.NEW] };
    } else if (filters.status === "in_progress") {
        where.status = { in: [OrderStatus.COOKING, OrderStatus.DELIVERING] };
    } else if (filters.status === "done") {
        where.status = OrderStatus.DONE;
    } else if (filters.status === "cancelled") {
        where.status = OrderStatus.CANCELLED;
    }

    return where;
}

/** Все фильтры в одном where - им пользуются и страница, и CSV-экспорт. */
export function buildOrdersWhere(
    filters: OrderFilters,
    now: Date = new Date(),
): Prisma.OrderWhereInput {
    const and: Prisma.OrderWhereInput[] = [buildBaseWhere(filters)];

    if (filters.dateRange === "today") {
        // Начало суток по времени магазина (Asia/Yerevan), а не сервера.
        and.push({ createdAt: { gte: getStartOfDayInTimezone(STORE_TIMEZONE, now) } });
    } else if (filters.dateRange === "7d") {
        and.push({ createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } });
    } else if (filters.dateRange === "30d") {
        and.push({ createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } });
    }

    const q = filters.q.trim();
    if (q) {
        const or: Prisma.OrderWhereInput[] = [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
        ];
        // Только цифры (до 9 знаков) - ещё и точный номер заказа.
        if (/^\d+$/.test(q) && q.length <= MAX_ORDER_ID_DIGITS) {
            or.push({ id: Number(q) });
        }
        and.push({ OR: or });
    }

    return { AND: and };
}

export type OrdersPage = {
    orders: OrderWithItems[];
    /** Заказов по статусу/доставке/оплате (без даты и поиска). */
    totalCount: number;
    /** Заказов после всех фильтров. */
    filteredCount: number;
    totalRevenue: number;
    deliveryCount: number;
    pickupCount: number;
    page: number;
    totalPages: number;
};

/**
 * Одна страница заказов + итоги по ВСЕМ отфильтрованным заказам, посчитанные в БД.
 *
 * Раньше страница загружала в память все заказы вместе с позициями и резала их в JS
 * (поиск и фильтр по дате - тоже в JS): время и память росли вместе с историей заказов.
 */
export async function getOrdersPage(params: {
    filters: OrderFilters;
    sortField: SortField;
    sortDir: SortDirection;
    page: number;
    pageSize: number;
    now?: Date;
}): Promise<OrdersPage> {
    const { filters, sortField, sortDir, pageSize } = params;
    const where = buildOrdersWhere(filters, params.now);

    const [totalCount, revenue, byDelivery] = await Promise.all([
        prisma.order.count({ where: buildBaseWhere(filters) }),
        prisma.order.aggregate({ where, _count: { _all: true }, _sum: { totalPrice: true } }),
        prisma.order.groupBy({ by: ["delivery"], where, _count: { _all: true } }),
    ]);

    const filteredCount = revenue._count._all;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    const page = Math.min(Math.max(1, params.page), totalPages);

    const orders = await prisma.order.findMany({
        where,
        orderBy: buildOrderBy(sortField, sortDir),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: true },
    });

    const countFor = (type: DeliveryType) =>
        byDelivery.find((row) => row.delivery === type)?._count._all ?? 0;

    return {
        orders,
        totalCount,
        filteredCount,
        totalRevenue: revenue._sum.totalPrice ?? 0,
        deliveryCount: countFor(DeliveryType.DELIVERY),
        pickupCount: countFor(DeliveryType.PICKUP),
        page,
        totalPages,
    };
}

/**
 * Обход ВСЕХ заказов под фильтром порциями (для экспорта): память ограничена размером
 * порции, а не всей историей заказов.
 */
export async function* iterateOrders(params: {
    filters: OrderFilters;
    sortField: SortField;
    sortDir: SortDirection;
    batchSize?: number;
    now?: Date;
}): AsyncGenerator<OrderWithItems[]> {
    const where = buildOrdersWhere(params.filters, params.now);
    const orderBy = buildOrderBy(params.sortField, params.sortDir);
    const batchSize = params.batchSize ?? 500;

    for (let skip = 0; ; skip += batchSize) {
        const batch = await prisma.order.findMany({
            where,
            orderBy,
            skip,
            take: batchSize,
            include: { items: true },
        });
        if (batch.length === 0) return;
        yield batch;
        if (batch.length < batchSize) return;
    }
}

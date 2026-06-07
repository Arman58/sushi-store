import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

function createPrismaClient() {
    return new PrismaClient({
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
    });
}

let prismaClient: PrismaClient | undefined;

function discardStaleDevClient(client: PrismaClient | undefined): void {
    if (
        process.env.NODE_ENV === "production" ||
        !client ||
        (client as unknown as { deliveryZone?: unknown }).deliveryZone !== undefined
    ) {
        return;
    }
    void client.$disconnect().catch(() => {});
}

function resolvePrismaClient(): PrismaClient {
    if (process.env.NODE_ENV !== "production") {
        discardStaleDevClient(globalForPrisma.prisma);
        if (
            globalForPrisma.prisma &&
            (globalForPrisma.prisma as unknown as { deliveryZone?: unknown }).deliveryZone === undefined
        ) {
            globalForPrisma.prisma = undefined;
        }
    }

    discardStaleDevClient(prismaClient);
    if (
        prismaClient &&
        process.env.NODE_ENV !== "production" &&
        (prismaClient as unknown as { deliveryZone?: unknown }).deliveryZone === undefined
    ) {
        prismaClient = undefined;
    }

    if (!prismaClient) {
        prismaClient =
            process.env.NODE_ENV !== "production" && globalForPrisma.prisma
                ? globalForPrisma.prisma
                : createPrismaClient();
        globalForPrisma.prisma = prismaClient;
    }

    return prismaClient;
}

/**
 * Ленивый доступ через Proxy: после `prisma generate` без перезапуска dev первый запрос
 * получит клиент с актуальными моделями.
 *
 * Важно: у Reflect.get третий аргумент — реальный клиент, не Proxy; иначе у Prisma
 * делегаты вроде `deliveryZone` оказываются undefined → `.findMany` падает.
 */
export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        const client = resolvePrismaClient();
        const value = Reflect.get(client as object, prop, client);
        return typeof value === "function"
            ? (value as (...args: unknown[]) => unknown).bind(client)
            : value;
    },
});

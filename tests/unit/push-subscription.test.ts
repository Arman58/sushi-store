import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, afterEach, beforeEach, describe, it, mock } from "node:test";

import { Prisma } from "@prisma/client";

type Subscription = {
    id: string;
    endpoint: string;
    userId: number | null;
    keys: { p256dh: string; auth: string } | null;
};
type OwnershipWhere = {
    endpoint: string;
    OR: Array<{ userId: number | null }>;
};
type WriteData = {
    userId: number;
    keys: { p256dh: string; auth: string };
};

const endpoint = "https://fcm.googleapis.com/fcm/send/token";
const keys = { p256dh: "new-public-key", auth: "new-auth-key" };
let rows: Subscription[] = [];
let raceOwner: number | null | undefined;
let raceCode = "P2002";
let writes = 0;
let deleteFails = false;
const sent: string[] = [];
const deleted: string[][] = [];

function writeConflict(code = "P2002") {
    return new Prisma.PrismaClientKnownRequestError("Unique endpoint", {
        code,
        clientVersion: "test",
    });
}

function matchesOwnership(row: Subscription, where: OwnershipWhere) {
    assert.deepEqual(where.OR, [{ userId: 7 }, { userId: null }]);
    return row.endpoint === where.endpoint &&
        where.OR.some((condition) => row.userId === condition.userId);
}

// Replace dependencies before loading either entry point: no DB or network is used.
const loadModule = createRequire(__filename);
const originals = new Map<string, NodeJS.Module | undefined>();
function stubModule(id: string, exports: unknown) {
    const filename = loadModule.resolve(id);
    originals.set(filename, loadModule.cache[filename]);
    loadModule.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeJS.Module;
}

stubModule("@/lib/auth", { auth: async () => ({ user: { id: "7" } }) });
stubModule("@/lib/debug-log", { debugLog: () => {} });
stubModule("@/lib/rate-limit", { checkRateLimit: async () => ({ allowed: true }) });
stubModule("@/lib/push-vapid", { getVapidSubject: () => "mailto:test@example.test" });
stubModule("@/lib/backend-i18n", {});
stubModule("web-push", {
    setVapidDetails: () => {},
    sendNotification: async (subscription: { endpoint: string }) => {
        sent.push(subscription.endpoint);
    },
});
stubModule("@/lib/prisma", {
    prisma: {
        pushSubscription: {
            upsert: async ({ where, create, update }: {
                where: OwnershipWhere;
                create: WriteData & { endpoint: string };
                update: WriteData;
            }) => {
                writes++;
                if (raceOwner !== undefined) {
                    rows.push(makeRow({ userId: raceOwner }));
                    throw writeConflict(raceCode);
                }
                const row = rows.find((row) => matchesOwnership(row, where));
                if (row) {
                    Object.assign(row, update);
                } else {
                    if (rows.some((row) => row.endpoint === create.endpoint)) throw writeConflict();
                    rows.push(makeRow(create));
                }
            },
            updateMany: async ({ where, data }: { where: OwnershipWhere; data: WriteData }) => {
                writes++;
                const matching = rows.filter((row) => matchesOwnership(row, where));
                matching.forEach((row) => Object.assign(row, data));
                return { count: matching.length };
            },
            findMany: async () => rows,
            deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
                deleted.push(where.id.in);
                if (deleteFails) throw new Error("Delete failed");
                rows = rows.filter((row) => !where.id.in.includes(row.id));
            },
        },
    },
});

const { POST } = loadModule("@/app/api/push/subscribe/route") as typeof import("@/app/api/push/subscribe/route");
const { sendPushNotification } = loadModule("@/lib/push-notifications") as typeof import("@/lib/push-notifications");
const previousPrivateKey = process.env.VAPID_PRIVATE_KEY;
const previousPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function makeRow(overrides: Partial<Subscription> = {}): Subscription {
    return { id: "subscription-1", endpoint, userId: 7, keys: { p256dh: "old", auth: "old" }, ...overrides };
}

function subscribe(url = endpoint) {
    return POST(new Request("https://store.example.test/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: url, keys }),
    }));
}

beforeEach(() => {
    rows = [];
    raceOwner = undefined;
    raceCode = "P2002";
    writes = 0;
    deleteFails = false;
    sent.length = 0;
    deleted.length = 0;
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
});
afterEach(() => mock.restoreAll());
after(() => {
    for (const [filename, original] of originals) {
        if (original) loadModule.cache[filename] = original;
        else delete loadModule.cache[filename];
    }
    if (previousPrivateKey === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = previousPrivateKey;
    if (previousPublicKey === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = previousPublicKey;
});

describe("POST /api/push/subscribe", () => {
    it("rejects an arbitrary endpoint with a generic 400 before any write", async () => {
        const response = await subscribe("https://127.0.0.1/private");
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: "Invalid subscription" });
        assert.equal(writes, 0);
    });

    it("creates a valid subscription for the authenticated user", async () => {
        assert.equal((await subscribe()).status, 200);
        assert.deepEqual(rows, [makeRow({ keys })]);
    });

    it("refreshes keys for the current owner", async () => {
        rows = [makeRow()];
        assert.equal((await subscribe()).status, 200);
        assert.deepEqual(rows[0], makeRow({ keys }));
    });

    it("claims an unowned subscription", async () => {
        rows = [makeRow({ userId: null })];
        assert.equal((await subscribe()).status, 200);
        assert.deepEqual(rows[0], makeRow({ keys }));
    });

    it("returns 409 without changing another user's subscription or keys", async () => {
        const foreign = makeRow({ userId: 8 });
        rows = [structuredClone(foreign)];
        const response = await subscribe();
        assert.equal(response.status, 409);
        assert.deepEqual(rows, [foreign]);
    });

    for (const owner of [7, null, 8]) {
        it(`handles a concurrent insert owned by ${owner}`, async () => {
            raceOwner = owner;
            const response = await subscribe();
            assert.equal(response.status, owner === 8 ? 409 : 200);
            assert.deepEqual(rows[0], owner === 8 ? makeRow({ userId: 8 }) : makeRow({ keys }));
        });
    }

    it("returns 409 when a concurrent claim makes the upsert update miss (P2025)", async () => {
        raceOwner = 8;
        raceCode = "P2025";
        assert.equal((await subscribe()).status, 409);
        assert.deepEqual(rows, [makeRow({ userId: 8 })]);
    });
});

describe("sendPushNotification endpoint validation", () => {
    const payload = { title: "Order", body: "Ready", url: "/orders/1" };

    it("deletes invalid subscriptions, logs once, and sends only to valid endpoints", async () => {
        rows = [
            makeRow(),
            makeRow({ id: "internal", endpoint: "https://127.0.0.1/private" }),
            makeRow({ id: "lookalike", endpoint: "https://fcm.googleapis.com.evil.test/token", keys: null }),
        ];
        const warning = mock.method(console, "warn", () => {});
        await sendPushNotification(7, payload);
        assert.deepEqual(sent, [endpoint]);
        assert.deepEqual(deleted, [["internal", "lookalike"]]);
        assert.equal(warning.mock.callCount(), 1);
        assert.deepEqual(rows, [makeRow()]);
    });

    it("never sends an invalid endpoint even when cleanup fails", async () => {
        rows = [makeRow({ endpoint: "http://fcm.googleapis.com/token" })];
        deleteFails = true;
        const warning = mock.method(console, "warn", () => {});
        await sendPushNotification(7, payload);
        assert.deepEqual(sent, []);
        assert.deepEqual(deleted, [["subscription-1"]]);
        assert.equal(warning.mock.callCount(), 1);
    });
});

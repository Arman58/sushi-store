import { randomBytes } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import messages from "../../src/messages/hy.json";

export const admin = messages.admin;
export { messages };

/** Call once at module scope: each spec file gets its own login limiter bucket. */
export function adminLoginIp() {
    return `fd00:${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}::1`;
}

export async function loginAdmin(page: Page, ip: string) {
    const response = await page.request.post("/api/admin/login", {
        form: {
            user: process.env.ADMIN_USER ?? "admin",
            pass: process.env.ADMIN_PASS ?? "e2e-admin-pass",
        },
        headers: { "x-real-ip": ip },
        maxRedirects: 0,
    });
    test.skip(
        response.status() === 503,
        "ADMIN_SESSION_SECRET must contain at least 32 characters",
    );
    expect(response.status(), await response.text()).toBe(303);
    expect(response.headers()["set-cookie"]).toContain("admin_auth=");

    // Exercise the default Armenian UI; never load remote images/analytics in these specs.
    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (
            url.origin !== new URL(response.url()).origin ||
            url.pathname === "/_next/image"
        ) {
            await route.abort();
        } else {
            await route.continue();
        }
    });
}

/** Fixtures must only mutate an explicitly configured, disposable local database. */
export function localAdminPrisma() {
    const url = process.env.DATABASE_URL;
    if (
        !url ||
        !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)
    ) {
        throw new Error(
            "Admin E2E fixtures require DATABASE_URL pointing at a throwaway local Postgres",
        );
    }
    return new PrismaClient({ datasources: { db: { url } } });
}

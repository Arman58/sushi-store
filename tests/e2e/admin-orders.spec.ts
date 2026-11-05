import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
    admin,
    adminLoginIp,
    localAdminPrisma,
    loginAdmin,
    messages,
} from "./admin-helpers";

const loginIp = adminLoginIp();
const marker = `e2e-orders-${randomUUID()}`;
const formulaName = '=HYPERLINK("x","y")';
const orderCount = 31;
let prisma: ReturnType<typeof localAdminPrisma>;
let orderIds: number[] = [];

test.beforeAll(async () => {
    prisma = localAdminPrisma();
    await prisma.order.createMany({
        data: Array.from({ length: orderCount }, (_, index) => ({
            name: index === 0 ? formulaName : `E2E customer ${index}`,
            phone: marker,
            payment: "CASH" as const,
            delivery: "PICKUP" as const,
            status: "DONE" as const,
            totalPrice: 1000 + index,
        })),
    });
    orderIds = (
        await prisma.order.findMany({
            where: { phone: marker },
            orderBy: { id: "asc" },
            select: { id: true },
        })
    ).map((order) => order.id);
});

test.afterAll(async () => {
    if (!prisma) return;
    try {
        await prisma.order.deleteMany({ where: { phone: marker } });
    } finally {
        await prisma.$disconnect();
    }
});

test("pager visits every order and CSV exports all rows with BOM and formula protection", async ({
    page,
}) => {
    await loginAdmin(page, loginIp);
    const query = new URLSearchParams({ q: marker, sort: "id", dir: "asc" });
    await page.goto(`/admin/orders?${query}`);
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(25);
    await expect(
        page.getByText(
            admin.orders.pageOf
                .replace("{page}", "1")
                .replace("{totalPages}", "2"),
            { exact: true },
        ),
    ).toBeVisible();
    const firstPageIds = await rows.locator("td:first-child").allTextContents();
    expect(
        firstPageIds.map((id) => Number(id.trim().replace(/^#/, ""))),
    ).toEqual(orderIds.slice(0, 25));

    await page
        .getByRole("link", { name: messages.nav.forward, exact: true })
        .click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows).toHaveCount(orderCount - 25);
    await expect(
        page.getByText(
            admin.orders.pageOf
                .replace("{page}", "2")
                .replace("{totalPages}", "2"),
            { exact: true },
        ),
    ).toBeVisible();
    const secondPageIds = await rows
        .locator("td:first-child")
        .allTextContents();
    expect(
        secondPageIds.map((id) => Number(id.trim().replace(/^#/, ""))),
    ).toEqual(orderIds.slice(25));
    await page.reload();
    await expect(rows).toHaveCount(orderCount - 25);

    const exportHref = await page
        .getByRole("link", { name: admin.orders.exportCsv, exact: true })
        .getAttribute("href");
    expect(exportHref).toBeTruthy();
    const response = await page.request.get(exportHref!);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("text/csv");
    const bytes = await response.body();
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.toString("utf8").slice(1).trimEnd().split("\n");
    expect(lines).toHaveLength(orderCount + 1);
    expect(lines.slice(1).map((line) => Number(line.split(",")[0]))).toEqual(
        orderIds,
    );
    // Literal CSV expectation: the apostrophe is inside the quoted cell and quotes are doubled.
    expect(lines[1]).toContain(',"\'=HYPERLINK(""x"",""y"")",');

    await page
        .getByRole("link", { name: messages.nav.back, exact: true })
        .click();
    await expect(rows).toHaveCount(25);
    expect(await rows.locator("td:first-child").allTextContents()).toEqual(
        firstPageIds,
    );
});

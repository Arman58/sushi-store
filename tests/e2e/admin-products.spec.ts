import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
    admin,
    adminLoginIp,
    localAdminPrisma,
    loginAdmin,
} from "./admin-helpers";

const loginIp = adminLoginIp();
const name = `E2E uncategorized ${randomUUID()}`;
let prisma: ReturnType<typeof localAdminPrisma>;
let productId: number | undefined;
let uncategorizedCount: number;

test.beforeAll(async () => {
    prisma = localAdminPrisma();
    const category = await prisma.category.findFirstOrThrow();
    const product = await prisma.product.create({
        data: {
            slug: `e2e-uncategorized-${randomUUID()}`,
            price: 1000,
            categoryId: category.id,
            translations: {
                create: ["hy", "ru", "en"].map((locale) => ({ locale, name })),
            },
        },
    });
    productId = product.id;
    // Reproduce the legacy state directly through SQL, without a pg dependency.
    await prisma.$executeRaw`UPDATE "Product" SET "categoryId" = NULL WHERE "id" = ${productId}`;
    uncategorizedCount = await prisma.product.count({
        where: { categoryId: null },
    });
});

test.afterAll(async () => {
    if (!prisma) return;
    try {
        if (productId !== undefined)
            await prisma.product.delete({ where: { id: productId } });
    } finally {
        await prisma.$disconnect();
    }
});

test("uncategorized warning links to a filter containing only products without a category", async ({
    page,
}) => {
    await loginAdmin(page, loginIp);
    await page.goto("/admin/products");
    const alert = page
        .getByRole("alert")
        .filter({ hasText: admin.products.uncategorizedShow });
    await expect(alert).toContainText(
        admin.products.uncategorizedAlert.replace(
            "{count}",
            String(uncategorizedCount),
        ),
    );
    await alert
        .getByRole("button", {
            name: admin.products.uncategorizedShow,
            exact: true,
        })
        .click();
    await expect(alert).toBeHidden();
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(uncategorizedCount);
    await expect(rows.filter({ hasText: name })).toHaveCount(1);
    for (const row of await rows.all()) {
        // Category is the fifth column in the desktop table.
        await expect(row.getByRole("cell").nth(4)).toHaveText(
            admin.products.uncategorized,
        );
    }
});

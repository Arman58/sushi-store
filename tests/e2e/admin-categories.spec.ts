import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { admin, adminLoginIp, loginAdmin, messages } from "./admin-helpers";

const loginIp = adminLoginIp();

test.beforeEach(async ({ page }) => {
    await loginAdmin(page, loginIp);
});

test("new category is appended and moving it up persists after reload", async ({
    page,
}) => {
    await page.goto("/admin/categories");
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const originalCount = await rows.count();
    expect(originalCount).toBeGreaterThan(0);
    const name = `E2E category ${randomUUID()}`;
    let createdId: number | undefined;

    try {
        await page
            .getByRole("button", {
                name: admin.categories.addCategory,
                exact: true,
            })
            .click();
        const dialog = page.getByRole("dialog");
        await dialog
            .getByRole("textbox", {
                name: `${admin.common.name} · ${messages.languageSwitcher.localeRu}`,
            })
            .fill(name);
        await dialog
            .getByRole("button", { name: messages.languageSwitcher.localeHy })
            .click();
        await dialog
            .getByRole("textbox", {
                name: `${admin.common.name} · ${messages.languageSwitcher.localeHy}`,
            })
            .fill(name);
        const created = page.waitForResponse(
            (r) =>
                r.url().endsWith("/api/admin/categories") &&
                r.request().method() === "POST",
        );
        await dialog
            .getByRole("button", { name: admin.common.save, exact: true })
            .click();
        const response = await created;
        expect(response.status()).toBe(201);
        createdId = (await response.json()).id;
        await expect(dialog).toBeHidden();
        await expect(rows).toHaveCount(originalCount + 1);
        await expect(rows.last()).toContainText(name);
        await expect(
            rows
                .last()
                .getByRole("button", {
                    name: admin.categories.moveDown,
                    exact: true,
                }),
        ).toBeDisabled();

        const reordered = page.waitForResponse(
            (r) =>
                r.url().endsWith("/api/admin/categories/reorder") &&
                r.request().method() === "PUT",
        );
        await rows
            .last()
            .getByRole("button", { name: admin.categories.moveUp, exact: true })
            .click();
        expect((await reordered).ok()).toBeTruthy();
        await expect(rows.nth(originalCount - 1)).toContainText(name);
        await page.reload();
        await expect(rows).toHaveCount(originalCount + 1);
        await expect(rows.nth(originalCount - 1)).toContainText(name);
        await expect(rows.last()).not.toContainText(name);
    } finally {
        if (createdId !== undefined) {
            expect(
                (
                    await page.request.delete(
                        `/api/admin/categories/${createdId}`,
                    )
                ).ok(),
            ).toBeTruthy();
        }
    }
});

test("category containing products explains why deletion is blocked and hides Delete", async ({
    page,
}) => {
    const response = await page.request.get("/api/admin/categories");
    expect(response.ok()).toBeTruthy();
    const categories = (await response.json()) as Array<{
        id: number;
        name: { hy: string };
        productCount: number;
    }>;
    const category = categories.find(
        (item) => item.productCount > 0 && item.name.hy,
    );
    expect(
        category,
        "seed must include a category with products",
    ).toBeDefined();
    if (!category) throw new Error("Missing seeded category");
    await page.goto("/admin/categories");
    const row = page
        .getByRole("row")
        .filter({ has: page.getByText(category.name.hy, { exact: true }) });
    await row
        .getByRole("button", {
            name: admin.categories.deleteCategory,
            exact: true,
        })
        .click();
    const dialog = page.getByRole("dialog");
    const explanation = admin.categories.deleteBlockedProducts
        .replace("{name}", category.name.hy)
        .replace("{count}", String(category.productCount));
    await expect(dialog).toContainText(explanation);
    await expect(
        dialog.getByRole("button", { name: admin.common.delete, exact: true }),
    ).toHaveCount(0);
    await dialog
        .getByRole("button", { name: admin.common.cancel, exact: true })
        .click();
    await page.reload();
    await expect(row).toBeVisible();
});

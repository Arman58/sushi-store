import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { admin, adminLoginIp, loginAdmin } from "./admin-helpers";

const loginIp = adminLoginIp();

test.beforeEach(async ({ page }) => {
    await loginAdmin(page, loginIp);
    await page.goto("/admin/promocodes");
});

for (const kind of ["kindFreeDelivery", "kindCategory"] as const) {
    test(`create ${kind} through the dialog and show its kind in the table`, async ({
        page,
    }) => {
        const code = `E2E${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
        let createdId: number | undefined;
        try {
            await page
                .getByRole("button", {
                    name: admin.promocodes.addPromocode,
                    exact: true,
                })
                .click();
            const dialog = page.getByRole("dialog");
            await dialog
                .getByRole("textbox", {
                    name: admin.promocodes.code,
                    exact: false,
                })
                .fill(code);
            await dialog
                .getByRole("combobox", {
                    name: admin.promocodes.kind,
                    exact: false,
                })
                .click();
            await page
                .getByRole("option", {
                    name: admin.promocodes[kind],
                    exact: true,
                })
                .click();
            if (kind === "kindCategory") {
                await dialog
                    .getByRole("combobox", {
                        name: admin.promocodes.category,
                        exact: true,
                    })
                    .click();
                await page.getByRole("option").first().click();
                await dialog
                    .getByRole("spinbutton", {
                        name: admin.promocodes.percentValue,
                        exact: false,
                    })
                    .fill("15");
            }
            const created = page.waitForResponse(
                (r) =>
                    r.url().endsWith("/api/admin/promocodes") &&
                    r.request().method() === "POST",
            );
            await dialog
                .getByRole("button", { name: admin.common.save, exact: true })
                .click();
            const response = await created;
            expect(response.status()).toBe(201);
            createdId = (await response.json()).id;
            await expect(dialog).toBeHidden();
            const row = page
                .getByRole("row")
                .filter({ has: page.getByText(code, { exact: true }) });
            await expect(row.getByRole("cell").nth(1)).toHaveText(
                admin.promocodes[kind],
            );
            await page.reload();
            await expect(row.getByRole("cell").nth(1)).toHaveText(
                admin.promocodes[kind],
            );
        } finally {
            if (createdId !== undefined) {
                expect(
                    (
                        await page.request.delete(
                            `/api/admin/promocodes/${createdId}`,
                        )
                    ).ok(),
                ).toBeTruthy();
            }
        }
    });
}

test("150 percent displays validation feedback without sending a POST", async ({
    page,
}) => {
    await page
        .getByRole("button", {
            name: admin.promocodes.addPromocode,
            exact: true,
        })
        .click();
    const dialog = page.getByRole("dialog");
    await dialog
        .getByRole("textbox", { name: admin.promocodes.code, exact: false })
        .fill("E2EINVALID150");
    await dialog
        .getByRole("spinbutton", {
            name: admin.promocodes.percentValue,
            exact: false,
        })
        .fill("150");
    let posts = 0;
    // Catch even a failed POST, and prevent an unexpected regression from creating data.
    await page.route("**/api/admin/promocodes", async (route) => {
        if (route.request().method() === "POST") {
            posts += 1;
            await route.fulfill({
                status: 400,
                json: { error: "Unexpected POST" },
            });
        } else {
            await route.continue();
        }
    });
    await dialog
        .getByRole("button", { name: admin.common.save, exact: true })
        .click();
    await expect(
        page.getByText(admin.promocodes.validationPercent, { exact: true }),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    await dialog
        .getByRole("button", { name: admin.common.cancel, exact: true })
        .click();
    await expect(dialog).toBeHidden();
    expect(posts).toBe(0);
});

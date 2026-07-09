import { expect, test } from "@playwright/test";

import { openLoginDialog, prepareStorefront } from "./helpers";

test.describe("Регистрация и логин", () => {
    test.beforeEach(async ({ page }) => {
        await prepareStorefront(page);

        await page.route("**/api/auth/register", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ status: "OTP_SENT" }),
            });
        });
    });

    test("показывает экран ввода OTP после регистрации", async ({ page }) => {
        const email = `e2e-${Date.now()}@example.com`;

        await page.goto("/ru");
        await openLoginDialog(page);

        await page.getByRole("tab", { name: "Регистрация" }).click();

        await page.getByLabel("Имя").fill("E2E User");
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Пароль").fill("password123");

        await page.getByRole("button", { name: "Создать аккаунт" }).click();

        await expect(
            page.getByRole("heading", { name: "Подтвердите email" }),
        ).toBeVisible({ timeout: 15_000 });

        await expect(page.getByRole("textbox", { name: "Digit 1" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "Digit 2" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "Digit 3" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "Digit 4" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "Digit 5" })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "Digit 6" })).toBeVisible();
    });
});

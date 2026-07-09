import { expect, test } from "@playwright/test";

import {
    addFirstProductToCart,
    fillCheckoutForm,
    goToCheckoutFromCart,
    openCartDrawer,
    prepareStorefront,
    submitCheckout,
} from "./helpers";

test.describe("Гостевой заказ", () => {
    test.beforeEach(async ({ page }) => {
        await prepareStorefront(page);
    });

    test("оформляет заказ от главной до страницы заказа", async ({ page }) => {
        test.setTimeout(120_000);
        await page.goto("/ru");

        await addFirstProductToCart(page);

        await openCartDrawer(page);
        await goToCheckoutFromCart(page);

        await fillCheckoutForm(page);
        await submitCheckout(page);

        await expect(
            page.getByRole("heading", { name: "Следим за заказом" }),
        ).toBeVisible();
        await expect(page.getByText(/Заказ №\d+/)).toBeVisible();
    });

    test("применяет промокод в корзине перед оформлением", async ({ page }) => {
        test.setTimeout(120_000);

        await page.route("**/api/validate-promo", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    ok: true,
                    discountAmount: 500,
                    code: "TEST500",
                }),
            });
        });

        await page.goto("/ru");
        await addFirstProductToCart(page);
        await openCartDrawer(page);

        const cartDialog = page.getByRole("dialog", { name: "Корзина" });
        const promoInput = cartDialog.getByPlaceholder(/промокод/i);
        await promoInput.fill("TEST500");
        await cartDialog.getByRole("button", { name: /применить/i }).click();

        await expect(cartDialog.getByText(/TEST500/i)).toBeVisible({
            timeout: 15_000,
        });
    });

    test("оформляет заказ на мобильном viewport", async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto("/ru");

        await addFirstProductToCart(page);
        await openCartDrawer(page);
        await goToCheckoutFromCart(page);
        await fillCheckoutForm(page);
        await submitCheckout(page);

        await expect(
            page.getByRole("heading", { name: "Следим за заказом" }),
        ).toBeVisible();
    });
});

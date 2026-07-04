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
});

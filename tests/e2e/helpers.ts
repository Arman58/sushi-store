import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Dismiss PWA install prompts and reset persisted cart between tests. */
export async function prepareStorefront(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem("east-west-pwa-install-dismissed", "1");
        localStorage.setItem("ios-pwa-prompt-dismissed", "1");
        localStorage.removeItem("sushi-cart-v2");
        localStorage.removeItem("checkout-draft");
    });
}

export async function openLoginDialog(page: Page) {
    await page.getByRole("button", { name: "Войти" }).click();
    await page.getByRole("dialog").waitFor();
}

async function confirmModifiersIfOpen(page: Page) {
    const addToCart = page.getByRole("button", { name: "В корзину" });
    if (!(await addToCart.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return;
    }

    const dialog = page.getByRole("dialog");
    const radios = dialog.getByRole("radio");
    if ((await radios.count()) > 0) {
        await radios.first().click();
    }

    await addToCart.click();
    await expect(addToCart).toBeHidden({ timeout: 10_000 });
}

export async function addFirstProductToCart(page: Page) {
    await page.goto("/ru");
    await page.waitForLoadState("networkidle");

    let addButton = page.getByRole("button", { name: /^Добавить / }).first();
    if (!(await addButton.isVisible({ timeout: 8_000 }).catch(() => false))) {
        await page.goto("/ru/menu");
        await page.waitForLoadState("networkidle");
        addButton = page.getByRole("button", { name: /^Добавить / }).first();
    }

    await addButton.click();
    await confirmModifiersIfOpen(page);

    const headerCart = page.locator("header").getByRole("button", {
        name: "Открыть корзину",
    });
    await expect(headerCart).toContainText(/[1-9]/, { timeout: 15_000 });
}

export async function openCartDrawer(page: Page) {
    await page
        .locator("header")
        .getByRole("button", { name: "Открыть корзину" })
        .click();
    await page.getByRole("dialog", { name: "Корзина" }).waitFor({
        state: "visible",
        timeout: 15_000,
    });
}

export async function goToCheckoutFromCart(page: Page) {
    const cartDialog = page.getByRole("dialog", { name: "Корзина" });
    const checkoutCta = cartDialog.getByRole("link", { name: "Оформить заказ" });

    await expect(checkoutCta).toBeVisible({ timeout: 45_000 });
    await checkoutCta.click();
    await page.waitForURL(/\/checkout/, { timeout: 45_000 });
}

export async function fillCheckoutForm(page: Page) {
    await page.getByLabel("Ваше имя").fill("E2E Тест");

    const phone = page.getByLabel("Телефон");
    await phone.click();
    await phone.fill("");
    await phone.pressSequentially("37499123456", { delay: 30 });
    await phone.blur();

    await page.waitForResponse(
        (response) =>
            response.url().includes("/api/delivery-zones") && response.ok(),
        { timeout: 30_000 },
    ).catch(() => {});

    const zoneSelect = page.getByRole("combobox").first();
    await zoneSelect.click();
    await page.getByText("Нор Ачин - доставка бесплатно").click();

    await page.getByLabel("Адрес доставки").fill("ул. Тестовая, 1");
}

export async function submitCheckout(page: Page) {
    const submitButton = page.getByRole("button", { name: /Оформить заказ/ }).first();
    await expect(submitButton).toBeEnabled({ timeout: 45_000 });

    const orderResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/order") &&
            response.request().method() === "POST",
        { timeout: 60_000 },
    );

    await submitButton.click();
    const orderResponse = await orderResponsePromise;
    expect(orderResponse.ok()).toBeTruthy();

    await page.waitForURL(/\/(?:ru\/)?order\/\d+/, { timeout: 60_000 });
}

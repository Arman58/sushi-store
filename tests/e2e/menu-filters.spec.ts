import { expect, type Page,test } from "@playwright/test";

import { prepareStorefront } from "./helpers";

async function openMenu(page: Page) {
    await page.goto("/ru/menu");
    await page.waitForLoadState("networkidle");
    await expect(
        page.getByRole("button", { name: /^Добавить / }).first(),
    ).toBeVisible({ timeout: 30_000 });
}

function categoryParam(page: Page) {
    return new URL(page.url()).searchParams.get("category");
}

test.describe("Фильтры меню", () => {
    test.beforeEach(async ({ page }) => {
        await prepareStorefront(page);
    });

    test("интерактивные CategoryPills переключают категорию в URL", async ({
        page,
    }) => {
        await openMenu(page);

        const pizzaPill = page.getByRole("button", { name: /пицца/i });
        await expect(pizzaPill).toBeVisible({ timeout: 15_000 });

        await pizzaPill.click();
        await page.waitForURL(/category=pizza/, { timeout: 10_000 });
        expect(categoryParam(page)).toBe("pizza");
        await expect(pizzaPill).toHaveClass(/MuiChip-filled/);

        const pillsRow = page.locator(".MuiStack-root").filter({
            has: page.getByRole("button", { name: /пицца/i }),
        });
        const allPill = pillsRow.getByRole("button", { name: /все/i });
        await allPill.click();
        await page.waitForURL((url) => !url.searchParams.has("category"), {
            timeout: 10_000,
        });
        expect(categoryParam(page)).toBeNull();
        await expect(allPill).toHaveClass(/MuiChip-filled/);
        await expect(pizzaPill).not.toHaveClass(/MuiChip-filled/);
    });

    test("Filter Drawer меняет ценовой диапазон в URL", async ({ page }) => {
        await openMenu(page);

        await page.getByRole("button", { name: /фильтры/i }).click();

        const drawer = page.locator(".MuiDrawer-paper");
        await expect(
            drawer.getByRole("heading", { name: /фильтры/i }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(drawer.getByText(/категори/i)).toHaveCount(0);

        const sliders = drawer.getByRole("slider");
        await expect(sliders).toHaveCount(2);

        const maxSlider = sliders.nth(1);
        await expect(maxSlider).toBeEnabled();
        await maxSlider.focus();

        for (let i = 0; i < 8; i += 1) {
            await maxSlider.press("ArrowLeft");
        }

        await drawer.getByRole("button", { name: /показать/i }).click();

        await expect(drawer).toBeHidden({ timeout: 10_000 });

        await expect(page).toHaveURL(/price(Min|Max)=/, { timeout: 10_000 });
        const params = new URL(page.url()).searchParams;
        expect(
            params.has("priceMin") || params.has("priceMax"),
        ).toBeTruthy();
    });
});

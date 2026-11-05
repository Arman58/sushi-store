import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminCategoryReorderSchema } from "@/lib/api-schemas";
import { slugifyCategoryName } from "@/lib/category-slug";
import { toStorefrontCategories } from "@/lib/i18n-utils";

describe("adminCategoryReorderSchema", () => {
    it("принимает список уникальных id", () => {
        assert.equal(adminCategoryReorderSchema.safeParse({ ids: [3, 1, 2] }).success, true);
    });

    it("отклоняет дубликаты, пустой список, нечисловые и неположительные id", () => {
        for (const ids of [[1, 1], [], ["1"], [0], [-5], [1.5]]) {
            assert.equal(
                adminCategoryReorderSchema.safeParse({ ids }).success,
                false,
                JSON.stringify(ids),
            );
        }
        assert.equal(adminCategoryReorderSchema.safeParse({}).success, false);
    });
});

describe("slugifyCategoryName", () => {
    it("латиница и цифры превращаются в slug", () => {
        assert.equal(slugifyCategoryName("Hot Dogs 2"), "hot-dogs-2");
    });

    it("не оставляет дефисов по краям и повторов", () => {
        assert.equal(slugifyCategoryName("Десерты UI-тест"), "ui");
        assert.equal(slugifyCategoryName("  A --- B  "), "a-b");
    });

    it("название без латиницы даёт пустой slug (вызывающий код сгенерирует cat-...)", () => {
        assert.equal(slugifyCategoryName("Սուշի և ռոլներ"), "");
        assert.equal(slugifyCategoryName("Суши"), "");
    });
});

describe("toStorefrontCategories", () => {
    const translations = (name: string) => [{ locale: "ru", name }];

    it("сохраняет порядок из БД и не переставляет по названию (порядок задаёт админка)", () => {
        // Раньше "суши" и "сеты" поднимались наверх по подстрокам названия.
        const input = [
            { id: 1, slug: "drinks", position: 0, translations: translations("Напитки") },
            { id: 2, slug: "pizza", position: 1, translations: translations("Пицца") },
            { id: 3, slug: "sushi", position: 2, translations: translations("Суши") },
            { id: 4, slug: "sets", position: 3, translations: translations("Сеты") },
        ];
        const out = toStorefrontCategories(input, "ru");
        assert.deepEqual(
            out.map((c) => c.slug),
            ["drinks", "pizza", "sushi", "sets"],
        );
        assert.equal(out[2]?.name, "Суши");
    });
});

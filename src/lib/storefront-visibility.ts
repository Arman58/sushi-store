import type { Prisma } from "@prisma/client";

/**
 * Товар виден покупателям, если он активен И его категория не скрыта.
 *
 * Раньше выключатель "Активна" у категории убирал только плитку категории: её товары
 * оставались в общем меню, в поиске, в избранном и их можно было заказать.
 *
 * Товар без категории (`categoryId IS NULL`, остался со старых времён, когда удаление
 * категории обнуляло ссылку) не прячем: это ошибка данных, и терять из-за неё продажи
 * нельзя. Админка подсвечивает такие товары, чтобы им назначили категорию.
 *
 * Использовать как `where: { ...storefrontProductVisible, ...остальное }`
 * (в условии, куда подмешивается это, не должно быть своего `OR`).
 */
export const storefrontProductVisible = {
    isActive: true,
    OR: [{ categoryId: null }, { category: { isActive: true } }],
} satisfies Prisma.ProductWhereInput;

/** Та же проверка для уже загруженной строки (создание заказа, проверка корзины). */
export function isProductVisibleToCustomers(product: {
    isActive: boolean;
    category?: { isActive: boolean } | null;
}): boolean {
    return product.isActive && product.category?.isActive !== false;
}

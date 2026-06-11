/**
 * Гостевой доступ к странице трекинга заказа.
 *
 * MVP-модель:
 * - При создании заказа сервер выставляет HttpOnly cookie с accessToken (UUID v4).
 * - Страница /order/[id] принимает cookie ИЛИ legacy query ?key=<token> ИЛИ сессию владельца.
 *
 * Оценка рисков (Known trade-offs for MVP):
 * - UUID v4 (~122 бита энтропии) практически не брутфорсится; перебор id бесполезен без токена.
 * - Query ?key= всё ещё поддерживается для шаринга ссылки, но утечёт в Referer при переходе
 *   на внешний сайт и останется в истории браузера. Новые заказы редиректятся без key в URL.
 * - HttpOnly cookie снижает утечку через JS/XSS и убирает токен из адресной строки после чекаута.
 * - Полный отказ от query-параметра и magic-link по SMS потребует отдельного auth-flow (post-MVP).
 */

export const ORDER_ACCESS_COOKIE_PREFIX = "order_access_";

export function orderAccessCookieName(orderId: number): string {
    return `${ORDER_ACCESS_COOKIE_PREFIX}${String(orderId)}`;
}

export const ORDER_ACCESS_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

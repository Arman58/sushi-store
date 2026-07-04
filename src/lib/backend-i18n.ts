import type { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
    DEFAULT_STORE_LOCALE,
    STORE_LOCALES,
    type StoreLocale,
} from "@/lib/i18n-utils";
import {
    type ApiErrorBody,
    type ApiErrorCode,
} from "@/shared/lib/api-error";

type BackendMessageTemplate = {
    hy: string;
    ru: string;
    en: string;
};

/** Централизованные переводы серверных ошибок заказа. */
export const BACKEND_ERROR_MESSAGES: Record<ApiErrorCode, BackendMessageTemplate> =
    {
        PRICE_MISMATCH: {
            hy: "Գները թարմացվել են։ Խնդրում ենք հավաքել պատվերը նորից։",
            ru: "Цены на некоторые позиции обновились. Соберите заказ заново, чтобы увидеть актуальную сумму.",
            en: "Prices have changed. Please rebuild your order to see the updated total.",
        },
        ITEM_UNAVAILABLE: {
            hy: "«{name}» ապրանքը հասանելի չէ։ Հեռացրեք այն զամբյուղից։",
            ru: "Товар «{name}» недоступен. Удалите его из корзины.",
            en: "«{name}» is no longer available. Remove it from your cart.",
        },
        REQUIRED_MODIFIER_MISSING: {
            hy: "Ընտրեք տարբերակ՝ «{group}»",
            ru: "Выберите опцию: «{group}»",
            en: "Please select an option: «{group}»",
        },
        MODIFIER_LIMIT_EXCEEDED: {
            hy: "Չափազանց շատ տարբերակներ «{group}» խմբում",
            ru: "Слишком много опций в группе «{group}»",
            en: "Too many options selected in group «{group}»",
        },
        INVALID_CART_PAYLOAD: {
            hy: "Զամբյուղի տվյալները անվավեր են։ Թարմացրեք զամբյուղը և կրկին փորձեք։",
            ru: "Некорректные данные корзины. Обновите корзину и оформите заказ снова.",
            en: "Invalid cart data. Refresh your cart and try again.",
        },
        SCHEDULE_INVALID: {
            hy: "Ընտրված ժամը հասանելի չէ։ Ընտրեք այլ ժամ աշխատանքային ժամերի սահմաններում։",
            ru: "Выбранное время недоступно. Выберите другое время в рамках рабочих часов.",
            en: "The selected time is not available. Please pick another time within opening hours.",
        },
        STORE_CLOSED: {
            hy: "Խոհանոցը հիմա փակ է։ Աշխատում ենք ամեն օր 12:00-00:00։",
            ru: "Кухня сейчас закрыта. Мы работаем ежедневно с 12:00 до 00:00.",
            en: "The kitchen is closed right now. We are open daily from 12:00 to 00:00.",
        },
        CHANGE_FROM_TOO_SMALL: {
            hy: "Մանրի համար նշված գումարը փոքր է պատվերի գումարից։",
            ru: "Сумма для сдачи меньше суммы заказа.",
            en: "The cash amount for change is less than the order total.",
        },
        SUBTOTAL_MISMATCH: {
            hy: "Ապրանքների գումարը չի համընկնում սերվերի հաշվարկի հետ։ Թարմացրեք էջը։",
            ru: "Сумма товаров не совпадает с расчётом сервера. Обновите страницу.",
            en: "Item subtotal does not match the server calculation. Refresh the page.",
        },
        DISCOUNT_MISMATCH: {
            hy: "Զեղչի գումարը չի համընկնում սերվերի հաշվարկի հետ։ Թարմացրեք էջը։",
            ru: "Сумма скидки не совпадает с расчётом сервера. Обновите страницу.",
            en: "Discount amount does not match the server calculation. Refresh the page.",
        },
        TOTAL_MISMATCH: {
            hy: "Պատվերի ընդհանուր գումարը չի համընկնում։ Թարմացրեք էջը և կրկին փորձեք։",
            ru: "Сумма заказа не совпадает с расчётом позиций, доставки и скидки. Обновите страницу и попробуйте снова.",
            en: "Order total does not match items, delivery, and discount. Refresh the page and try again.",
        },
        PROMO_UNAVAILABLE: {
            hy: "Պրոմոկոդը այլևս հնարավոր չէ կիրառել",
            ru: "Промокод больше нельзя применить",
            en: "This promo code can no longer be applied",
        },
        ORDER_NOT_FOUND: {
            hy: "Պատվերը չի գտնվել",
            ru: "Заказ не найден",
            en: "Order not found",
        },
        INTERNAL_SERVER_ERROR: {
            hy: "Սերվերում սխալ է տեղի ունեցել",
            ru: "На сервере произошла ошибка",
            en: "Internal server error",
        },
    };

const INVALID_CART_PAYLOAD_MESSAGES: Record<
    "duplicate_modifier" | "foreign_modifier" | "unexpected_modifiers",
    BackendMessageTemplate
> = {
    duplicate_modifier: {
        hy: "Մեկ պոզիցիայում կրկնվում է նույն տարբերակը",
        ru: "Повтор модификатора в одной позиции",
        en: "Duplicate modifier in a single line item",
    },
    foreign_modifier: {
        hy: "Զամբյուղում նշված են անթույլատրելի տարբերակներ։ Թարմացրեք զամբյուղը։",
        ru: "В заказе указаны недопустимые опции. Обновите корзину и оформите заказ снова.",
        en: "Invalid options in your order. Refresh your cart and try again.",
    },
    unexpected_modifiers: {
        hy: "Այս ապրանքի համար տարբերակներ չկան։ Թարմացրեք զամբյուղը։",
        ru: "Для этого товара нет опций. Обновите корзину и оформите заказ снова.",
        en: "This product has no options. Refresh your cart and try again.",
    },
};

export type InvalidCartPayloadReason =
    keyof typeof INVALID_CART_PAYLOAD_MESSAGES;

export function resolveBackendLocale(locale?: string | null): StoreLocale {
    if (locale && STORE_LOCALES.includes(locale as StoreLocale)) {
        return locale as StoreLocale;
    }
    return DEFAULT_STORE_LOCALE;
}

function interpolate(
    template: string,
    params?: Record<string, string | number>,
): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = params[key];
        return value != null ? String(value) : `{${key}}`;
    });
}

export function getBackendErrorMessage(
    code: ApiErrorCode,
    locale?: string | null,
    params?: Record<string, string | number>,
): string {
    const resolved = resolveBackendLocale(locale);
    const template = BACKEND_ERROR_MESSAGES[code][resolved];
    return interpolate(template, params);
}

export function getInvalidCartPayloadMessage(
    reason: InvalidCartPayloadReason,
    locale?: string | null,
): string {
    const resolved = resolveBackendLocale(locale);
    return INVALID_CART_PAYLOAD_MESSAGES[reason][resolved];
}

type PushCopyTemplate = {
    title: BackendMessageTemplate;
    body: BackendMessageTemplate;
};

const PUSH_ORDER_FALLBACK_TITLE: BackendMessageTemplate = {
    hy: "Պատվեր #{id}",
    ru: "Заказ #{id}",
    en: "Order #{id}",
};

const PUSH_STATUS_PREFIX: BackendMessageTemplate = {
    hy: "Կարգավիճակ",
    ru: "Статус",
    en: "Status",
};

/** Тексты push при смене статуса заказа (COOKING / DELIVERING / DONE). */
export const PUSH_ORDER_STATUS_MESSAGES: Partial<
    Record<OrderStatus, PushCopyTemplate>
> = {
    COOKING: {
        title: {
            hy: "Պատվեր #{id} պատրաստվում է 👨‍🍳",
            ru: "Заказ #{id} готовится 👨‍🍳",
            en: "Order #{id} is being prepared 👨‍🍳",
        },
        body: {
            hy: "Արդեն խոհանոցում է — շուտով կփոխանցենք առաքիչին։",
            ru: "Уже на кухне — скоро передадим курьеру.",
            en: "Already in the kitchen — we'll hand it to the courier soon.",
        },
    },
    DELIVERING: {
        title: {
            hy: "Պատվեր #{id} ճանապարհին է 🛵",
            ru: "Заказ #{id} в пути 🛵",
            en: "Order #{id} is on the way 🛵",
        },
        body: {
            hy: "Առաքիչը արդեն գալիս է։ Հետևեք առաքմանը օնլայն։",
            ru: "Курьер уже едет к вам. Отслеживайте доставку онлайн.",
            en: "Your courier is on the way. Track delivery online.",
        },
    },
    DONE: {
        title: {
            hy: "Պատվեր #{id} առաքված է 🎉",
            ru: "Заказ #{id} доставлен 🎉",
            en: "Order #{id} delivered 🎉",
        },
        body: {
            hy: "Բարի ախորժակ! Գնահատեք ուտեստները — դա կվերցնի մեկ րոպե։",
            ru: "Приятного аппетита! Оцените блюда — это займёт минуту.",
            en: "Enjoy your meal! Rate your dishes — it only takes a minute.",
        },
    },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, BackendMessageTemplate> = {
    NEW: {
        hy: "Պատվերը ընդունված է",
        ru: "Заказ принят",
        en: "Order received",
    },
    COOKING: {
        hy: "Պատրաստվում է",
        ru: "Готовится",
        en: "Preparing",
    },
    DELIVERING: {
        hy: "Ճանապարհին",
        ru: "В пути",
        en: "On the way",
    },
    DONE: {
        hy: "Առաքված",
        ru: "Доставлен",
        en: "Delivered",
    },
    CANCELLED: {
        hy: "Չեղարկված",
        ru: "Отменён",
        en: "Cancelled",
    },
};

export function getPushOrderStatusCopy(
    status: OrderStatus,
    orderId: number,
    locale?: string | null,
): { title: string; body: string } {
    const resolved = resolveBackendLocale(locale);
    const template = PUSH_ORDER_STATUS_MESSAGES[status];
    if (template) {
        return {
            title: interpolate(template.title[resolved], { id: orderId }),
            body: template.body[resolved],
        };
    }
    return {
        title: interpolate(PUSH_ORDER_FALLBACK_TITLE[resolved], { id: orderId }),
        body: `${PUSH_STATUS_PREFIX[resolved]}: ${ORDER_STATUS_LABELS[status][resolved]}`,
    };
}

/** Путь к странице заказа с учётом localePrefix: as-needed. */
export function orderPagePath(orderId: number, locale?: string | null): string {
    const resolved = resolveBackendLocale(locale);
    if (resolved === DEFAULT_STORE_LOCALE) {
        return `/order/${orderId}`;
    }
    return `/${resolved}/order/${orderId}`;
}

/** Читает locale из payload заказа, Accept-Language или X-App-Locale. */
export function resolveOrderRequestLocale(
    request: Request,
    payloadLocale?: string | null,
): StoreLocale {
    if (payloadLocale && STORE_LOCALES.includes(payloadLocale as StoreLocale)) {
        return payloadLocale as StoreLocale;
    }

    const custom = request.headers.get("X-App-Locale")?.trim();
    if (custom && STORE_LOCALES.includes(custom as StoreLocale)) {
        return custom as StoreLocale;
    }

    const accept = request.headers.get("accept-language");
    if (accept) {
        const parts = accept.split(",").map((p) => p.trim().split(";")[0]);
        for (const part of parts) {
            const short = part.slice(0, 2).toLowerCase();
            if (STORE_LOCALES.includes(short as StoreLocale)) {
                return short as StoreLocale;
            }
        }
    }

    return DEFAULT_STORE_LOCALE;
}

export function localizedApiErrorJsonResponse(
    code: ApiErrorCode,
    locale: string | null | undefined,
    status: number,
    params?: Record<string, string | number>,
): NextResponse<ApiErrorBody> {
    return NextResponse.json(
        {
            error: getBackendErrorMessage(code, locale, params),
            code,
        },
        { status },
    );
}

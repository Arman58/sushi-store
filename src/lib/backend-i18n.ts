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

/**
 * Сообщения серверной валидации формы заказа (zod).
 * Ключи используются как message в zod-схеме, а на выходе route
 * переводятся под локаль запроса. Fallback - вернуть сам ключ.
 */
const FORM_VALIDATION_MESSAGES: Record<string, BackendMessageTemplate> = {
    "form.name.required": {
        hy: "Նշեք անունը",
        ru: "Укажите имя",
        en: "Enter your name",
    },
    "form.name.tooShort": {
        hy: "Անունը պետք է լինի առնվազն 2 նիշ",
        ru: "Имя должно быть не короче 2 символов",
        en: "Name must be at least 2 characters",
    },
    "form.item.invalidName": {
        hy: "Ապրանքի սխալ անվանում",
        ru: "Некорректное название товара",
        en: "Invalid product name",
    },
    "form.payment.invalid": {
        hy: "Վճարման սխալ եղանակ",
        ru: "Некорректный способ оплаты",
        en: "Invalid payment method",
    },
    "form.delivery.invalidType": {
        hy: "Առաքման սխալ տեսակ",
        ru: "Некорректный тип доставки",
        en: "Invalid delivery type",
    },
    "form.cart.empty": {
        hy: "Զամբյուղը դատարկ է",
        ru: "Корзина пуста",
        en: "Cart is empty",
    },
    "form.phone.requiredForDelivery": {
        hy: "Նշեք հեռախոսը առաքման համար",
        ru: "Укажите телефон для доставки",
        en: "Enter a phone number for delivery",
    },
    "form.address.required": {
        hy: "Նշեք առաքման հասցեն",
        ru: "Укажите адрес доставки",
        en: "Enter a delivery address",
    },
    "form.zone.required": {
        hy: "Ընտրեք առաքման գոտին",
        ru: "Выберите зону доставки",
        en: "Select a delivery zone",
    },
    "form.phone.invalid": {
        hy: "Մուտքագրեք ճիշտ համար (օր. XX XX XX XX)",
        ru: "Введите корректный номер (например, XX XX XX XX)",
        en: "Enter a valid number (e.g. XX XX XX XX)",
    },
    "form.discount.withoutPromo": {
        hy: "Զեղչը նշված է առանց պրոմոկոդի",
        ru: "Скидка указана без промокода",
        en: "Discount specified without a promo code",
    },
    "form.invalidPayload": {
        hy: "Պատվերի տվյալների սխալ ձևաչափ",
        ru: "Неверный формат данных заказа",
        en: "Invalid order data format",
    },
    "form.zone.selectRequired": {
        hy: "Ընտրեք առաքման գոտին",
        ru: "Выберите зону доставки",
        en: "Select a delivery zone",
    },
    "form.zone.unavailable": {
        hy: "Ընտրված առաքման գոտին հասանելի չէ",
        ru: "Выбранная зона доставки недоступна",
        en: "The selected delivery zone is unavailable",
    },
    "form.zone.belowMin": {
        hy: "Ընտրված գոտու նվազագույն պատվերը՝ {amount} ֏",
        ru: "Минимальная сумма заказа для выбранной зоны - {amount} ֏",
        en: "Minimum order amount for the selected zone is {amount} ֏",
    },
    "form.email.required": {
        hy: "Նշեք email-ը",
        ru: "Укажите email",
        en: "Enter your email",
    },
    "form.email.invalid": {
        hy: "Սխալ email",
        ru: "Некорректный email",
        en: "Invalid email",
    },
    "form.password.tooShort": {
        hy: "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ",
        ru: "Пароль должен быть не короче 8 символов",
        en: "Password must be at least 8 characters",
    },
    "form.generic": {
        hy: "Սխալ տվյալներ",
        ru: "Некорректные данные",
        en: "Invalid data",
    },
    "form.email.mismatch": {
        hy: "Email-ը չի համընկնում հաշվի հետ",
        ru: "Email не совпадает с аккаунтом",
        en: "Email does not match the account",
    },
    "form.auth.loginRequired": {
        hy: "Անհրաժեշտ է մուտք գործել հաշիվ",
        ru: "Необходимо войти в аккаунт",
        en: "You need to sign in",
    },
    "form.auth.userNotFound": {
        hy: "Օգտատերը չի գտնվել",
        ru: "Пользователь не найден",
        en: "User not found",
    },
    "form.auth.emailAlreadyVerified": {
        hy: "Փոստն արդեն հաստատված է",
        ru: "Почта уже подтверждена",
        en: "Email is already verified",
    },
    "form.auth.emailSendFailed": {
        hy: "Չհաջողվեց ուղարկել նամակ։ Փորձեք ավելի ուշ։",
        ru: "Не удалось отправить письмо. Попробуйте позже.",
        en: "Failed to send the email. Please try again later.",
    },
    "form.upload.tooBig": {
        hy: "Ֆայլը չափազանց մեծ է (առավ. 5 ՄԲ)",
        ru: "Файл слишком большой (макс 5 МБ)",
        en: "File is too large (max 5 MB)",
    },
    "form.products.loadFailed": {
        hy: "Չհաջողվեց բեռնել ապրանքները",
        ru: "Не удалось загрузить товары",
        en: "Failed to load products",
    },
    "form.upsell.loadFailed": {
        hy: "Չհաջողվեց բեռնել առաջարկները",
        ru: "Не удалось загрузить рекомендации",
        en: "Failed to load recommendations",
    },
    "form.deliveryZones.loadFailed": {
        hy: "Չհաջողվեց բեռնել առաքման գոտիները",
        ru: "Не удалось загрузить зоны доставки",
        en: "Failed to load delivery zones",
    },
    "form.promo.codeRequired": {
        hy: "Նշեք պրոմոկոդը",
        ru: "Укажите промокод",
        en: "Enter a promo code",
    },
    "form.cart.invalidAmount": {
        hy: "Զամբյուղը դատարկ է կամ գումարը սխալ է",
        ru: "Корзина пустая или сумма указана некорректно",
        en: "Cart is empty or the amount is invalid",
    },
};

export function getFormValidationMessage(
    key: string,
    locale?: string | null,
    params?: Record<string, string | number>,
): string {
    const template = FORM_VALIDATION_MESSAGES[key];
    if (!template) return key;
    const resolved = resolveBackendLocale(locale);
    return interpolate(template[resolved], params);
}

/** Переводы причин отклонения промокода (см. PromoRejection.code). */
const PROMO_REJECTION_MESSAGES: Record<string, BackendMessageTemplate> = {
    notFound: {
        hy: "Պրոմոկոդը չի գտնվել",
        ru: "Промокод не найден",
        en: "Promo code not found",
    },
    inactive: {
        hy: "Պրոմոկոդն ակտիվ չէ",
        ru: "Промокод неактивен",
        en: "Promo code is inactive",
    },
    expired: {
        hy: "Պրոմոկոդի ժամկետն անցել է",
        ru: "Срок действия промокода истёк",
        en: "Promo code has expired",
    },
    usedUp: {
        hy: "Պրոմոկոդն այլևս հնարավոր չէ կիրառել",
        ru: "Промокод больше нельзя применить",
        en: "This promo code can no longer be applied",
    },
    belowMin: {
        hy: "Այս պրոմոկոդի համար պատվերը՝ {amount} ֏-ից",
        ru: "Заказ от {amount} ֏ для этого промокода",
        en: "Order from {amount} ֏ for this promo code",
    },
    misconfigured: {
        hy: "Պրոմոկոդը կարգավորված է սխալ",
        ru: "Промокод настроен некорректно",
        en: "Promo code is misconfigured",
    },
    noDiscount: {
        hy: "Պրոմոկոդը այս գումարի համար զեղչ չի տալիս",
        ru: "Промокод не даёт скидку для этой суммы",
        en: "Promo code gives no discount for this amount",
    },
    codeRequired: {
        hy: "Նշեք պրոմոկոդը",
        ru: "Укажите промокод",
        en: "Enter a promo code",
    },
    checkFailed: {
        hy: "Չհաջողվեց ստուգել պրոմոկոդը",
        ru: "Не удалось проверить промокод",
        en: "Failed to validate the promo code",
    },
};

export function getPromoRejectionMessage(
    code: string,
    locale?: string | null,
    params?: Record<string, string | number>,
): string {
    const template = PROMO_REJECTION_MESSAGES[code];
    if (!template) return code;
    const resolved = resolveBackendLocale(locale);
    return interpolate(template[resolved], params);
}

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
            hy: "Արդեն խոհանոցում է - շուտով կփոխանցենք առաքիչին։",
            ru: "Уже на кухне - скоро передадим курьеру.",
            en: "Already in the kitchen - we'll hand it to the courier soon.",
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
            hy: "Բարի ախորժակ! Գնահատեք ուտեստները - դա կվերցնի մեկ րոպե։",
            ru: "Приятного аппетита! Оцените блюда - это займёт минуту.",
            en: "Enjoy your meal! Rate your dishes - it only takes a minute.",
        },
    },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, BackendMessageTemplate> = {
    PENDING_APPROVAL: {
        hy: "Սպասում է հաստատման",
        ru: "Ожидает подтверждения",
        en: "Awaiting approval",
    },
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

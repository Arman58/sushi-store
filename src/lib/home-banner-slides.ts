import type { DiscountType, PromoCode } from "@prisma/client";

import { getProductCoverUrl } from "@/shared/lib/product-cover";
import type { PromoBannerSlide } from "@/widgets/home/promo-banner-carousel";

import type { HomeProductPayload } from "./home-product-include";

const DEFAULT_SLIDE: PromoBannerSlide = {
    title: "Скидка на первый заказ",
    subtitle: "−20% по промокоду при оформлении - выберите блюда в меню",
    gradient: "linear-gradient(135deg, #E85D4A 0%, #FFB74D 100%)",
    href: "/menu",
};

function formatPromoDiscount(
    discountType: DiscountType,
    discountValue: number,
): string {
    if (discountType === "PERCENTAGE") {
        return `${discountValue}%`;
    }
    return `${discountValue.toLocaleString("ru-RU")} ֏`;
}

function promoToSlide(promo: PromoCode): PromoBannerSlide {
    const discount = formatPromoDiscount(promo.discountType, promo.discountValue);
    const minPart =
        promo.minOrderAmount != null
            ? ` · от ${promo.minOrderAmount.toLocaleString("ru-RU")} ֏`
            : "";
    return {
        title: `Промокод ${promo.code}`,
        subtitle: `Скидка ${discount}${minPart}`,
        gradient: "linear-gradient(135deg, #5C6BC0 0%, #9575CD 100%)",
        href: "/menu",
    };
}

function productToSlide(product: HomeProductPayload): PromoBannerSlide {
    const cover = getProductCoverUrl(product);
    return {
        title: product.name,
        subtitle: `${product.price.toLocaleString("ru-RU")} ֏`,
        gradient: "linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%)",
        href: "/menu",
        imageUrl: cover ?? undefined,
    };
}

export function buildHomeBannerSlides(
    promos: PromoCode[],
    featuredProducts: HomeProductPayload[],
): PromoBannerSlide[] {
    const slides: PromoBannerSlide[] = [DEFAULT_SLIDE];

    for (const promo of promos.slice(0, 3)) {
        slides.push(promoToSlide(promo));
    }

    if (slides.length === 1 && featuredProducts.length > 0) {
        for (const product of featuredProducts.slice(0, 3)) {
            slides.push(productToSlide(product));
        }
    }

    return slides;
}

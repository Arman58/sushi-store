import { PromoCarousel } from "@/widgets/promo-carousel";

/** Static client carousel — no async work, avoids a redundant Suspense boundary. */
export function HomePromoCarouselSection() {
    return <PromoCarousel />;
}

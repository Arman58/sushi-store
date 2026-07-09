import Container from "@mui/material/Container";
import { unstable_cache } from "next/cache";
import dynamic from "next/dynamic";
import { getLocale, getTranslations } from "next-intl/server";

import {
    homeProductCardInclude,
    mapProductToPopular,
} from "@/lib/home-product-include";
import { prisma } from "@/lib/prisma";

const PopularSection = dynamic(
    () =>
        import("@/widgets/home/popular-section").then((m) => m.PopularSection),
);

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

/** Новинки кэшируются на 60 сек — без похода в БД на каждый визит. */
const getNewArrivalsCached = unstable_cache(
    async (locale: string) => {
        const newProductsRaw = await prisma.product
            .findMany({
                where: { isActive: true },
                include: homeProductCardInclude,
                take: 6,
                orderBy: { id: "desc" },
            })
            .catch(() => []);
        return newProductsRaw.map((p) => mapProductToPopular(p, locale));
    },
    ["home-new-arrivals"],
    { revalidate: 60 },
);

export async function HomeNewArrivalsSection() {
    const locale = await getLocale();
    const t = await getTranslations("home");

    const newItems = await getNewArrivalsCached(locale);

    if (newItems.length === 0) {
        return null;
    }

    return (
        <Container
            sx={{
                ...sectionContainerSx,
                mt: { xs: 3, md: 6 },
            }}
        >
            <PopularSection
                products={newItems}
                title={t("newArrivals")}
                badge="new"
                seeAllHref="/menu"
                seeAllLabel={t("seeAll")}
            />
        </Container>
    );
}

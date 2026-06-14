import Container from "@mui/material/Container";
import { getLocale, getTranslations } from "next-intl/server";

import {
    homeProductInclude,
    mapProductToPopular,
} from "@/lib/home-product-include";
import { prisma } from "@/lib/prisma";
import { PopularSection } from "@/widgets/home/popular-section";

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

export async function HomeNewArrivalsSection() {
    const locale = await getLocale();
    const t = await getTranslations("home");

    const newProductsRaw = await prisma.product
        .findMany({
            where: { isActive: true },
            include: homeProductInclude,
            take: 6,
            orderBy: { id: "desc" },
        })
        .catch(() => []);

    const newItems = newProductsRaw.map((p) => mapProductToPopular(p, locale));

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
                prioritizeFirstImage
                title={t("newArrivals")}
                badge="new"
                seeAllHref="/menu"
                seeAllLabel={t("seeAll")}
            />
        </Container>
    );
}

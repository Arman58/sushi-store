import Container from "@mui/material/Container";
import { getLocale } from "next-intl/server";

import { fetchStorefrontCategories } from "@/widgets/category-pills/lib/fetch-storefront-categories";
import { CategoryPillsList } from "@/widgets/category-pills/ui/CategoryPillsList";

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

export async function HomeCategoryPillsSection() {
    const locale = await getLocale();
    const categories = await fetchStorefrontCategories(locale);

    if (categories.length === 0) {
        return null;
    }

    return (
        <Container
            sx={{
                ...sectionContainerSx,
                mt: { xs: 2, md: 3 },
            }}
        >
            <CategoryPillsList categories={categories} mode="link" />
        </Container>
    );
}

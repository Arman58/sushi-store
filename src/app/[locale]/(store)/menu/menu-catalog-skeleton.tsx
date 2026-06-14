import Box from "@mui/material/Box";

import { ProductCardSkeleton } from "@/entities/product/ui/product-card";

const CARD_COUNT = 8;

/** Catalog-only skeleton — hero renders immediately above this boundary. */
export function MenuCatalogSkeleton() {
    return (
        <Box
            aria-busy="true"
            aria-label="Loading menu"
            sx={{
                display: "grid",
                gap: { xs: 1.5, sm: 2 },
                gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(3, minmax(0, 1fr))",
                    md: "repeat(4, minmax(0, 1fr))",
                },
            }}
        >
            {Array.from({ length: CARD_COUNT }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </Box>
    );
}

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { ProductCardSkeleton } from "@/entities/product/ui/product-card";
import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

const CARD_COUNT = 8;

export function PopularSectionSkeleton() {
    return (
        <Box component="section" aria-busy="true" aria-label="Loading products">
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: { xs: 2.5, sm: 3 } }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Skeleton
                        variant="rectangular"
                        animation="wave"
                        width={4}
                        height={28}
                        sx={{ borderRadius: 999, ...skeletonSurfaceSx }}
                    />
                    <Skeleton
                        variant="text"
                        animation="wave"
                        width={160}
                        height={32}
                        sx={skeletonSurfaceSx}
                    />
                </Stack>
                <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={88}
                    height={32}
                    sx={{ borderRadius: "10px", ...skeletonSurfaceSx }}
                />
            </Stack>

            <Box
                sx={{
                    display: "grid",
                    gap: { xs: 1.5, sm: 2, md: 2.5 },
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
        </Box>
    );
}

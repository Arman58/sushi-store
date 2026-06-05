/**
 * Global route loading UI — главная и другие сегменты без собственного loading.tsx.
 * Сетка карточек совпадает с популярной лентой.
 */

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { ProductCardSkeleton } from "@/entities/product/ui/product-card";

export default function RootLoading() {
    return (
        <main>
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 3, sm: 4 } }}>
                <Skeleton
                    variant="rounded"
                    animation="wave"
                    height={200}
                    sx={{ borderRadius: 3, mb: 3 }}
                />
                <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            animation="wave"
                            width={72}
                            height={32}
                            sx={{ borderRadius: 999 }}
                        />
                    ))}
                </Stack>
                <Skeleton
                    variant="text"
                    animation="wave"
                    width={180}
                    height={36}
                    sx={{ mb: 2 }}
                />
                <Box
                    sx={{
                        display: "grid",
                        gap: { xs: 1.5, sm: 2 },
                        gridTemplateColumns: {
                            xs: "repeat(2, 1fr)",
                            sm: "repeat(3, 1fr)",
                            md: "repeat(4, 1fr)",
                        },
                    }}
                >
                    {Array.from({ length: 8 }).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                    ))}
                </Box>
            </Container>
        </main>
    );
}

"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { ProductCardSkeleton } from "@/entities/product/ui/product-card";

const SKELETON_COUNT = 12;

/**
 * Full-page skeleton shown while the menu Server Component is streaming.
 * Drop this into app/menu/loading.tsx to get instant perceived performance.
 */
export function MenuSectionSkeleton() {
    return (
        <Box sx={{ mt: 3 }}>
            {/* Tabs skeleton */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflow: "hidden" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        variant="rounded"
                        width={80}
                        height={36}
                        sx={{ borderRadius: 999, flexShrink: 0 }}
                    />
                ))}
            </Stack>

            {/* Search + filter bar skeleton */}
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Skeleton variant="rounded" height={40} sx={{ flex: 1, maxWidth: 260, borderRadius: 2 }} />
                <Skeleton variant="rounded" width={260} height={40} sx={{ borderRadius: 2 }} />
            </Stack>

            {/* Grid skeleton */}
            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                        xs: "1fr 1fr",
                        sm: "repeat(3, minmax(0, 1fr))",
                        md: "repeat(4, minmax(0, 1fr))",
                    },
                }}
            >
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </Box>
        </Box>
    );
}

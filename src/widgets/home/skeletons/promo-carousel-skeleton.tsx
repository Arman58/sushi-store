import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

export function PromoCarouselSkeleton() {
    return (
        <Box sx={{ position: "relative" }}>
            <Skeleton
                variant="rectangular"
                animation="wave"
                sx={{
                    width: "100%",
                    height: { xs: 220, sm: 320, md: 420 },
                    borderRadius: { xs: 2, md: 3 },
                    ...skeletonSurfaceSx,
                }}
            />
            <Stack
                spacing={1}
                sx={{
                    position: "absolute",
                    left: { xs: 20, md: 32 },
                    bottom: { xs: 20, md: 32 },
                    maxWidth: "60%",
                }}
            >
                <Skeleton
                    variant="text"
                    animation="wave"
                    width={120}
                    height={20}
                    sx={skeletonSurfaceSx}
                />
                <Skeleton
                    variant="text"
                    animation="wave"
                    width="100%"
                    height={36}
                    sx={skeletonSurfaceSx}
                />
                <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={140}
                    height={40}
                    sx={{ borderRadius: 999, ...skeletonSurfaceSx }}
                />
            </Stack>
            <Stack
                direction="row"
                spacing={0.75}
                sx={{
                    position: "absolute",
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                }}
            >
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        variant="circular"
                        animation="wave"
                        width={8}
                        height={8}
                        sx={skeletonSurfaceSx}
                    />
                ))}
            </Stack>
        </Box>
    );
}

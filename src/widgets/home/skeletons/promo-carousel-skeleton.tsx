import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

/**
 * Matches BannerCarousel slide geometry (aspect-ratio 5/2, mobile 86vw).
 * Old fixed heights (220/320/420) caused large CLS when real banners resolved.
 */
export function PromoCarouselSkeleton() {
    return (
        <Box
            sx={{
                position: "relative",
                mx: { xs: -2, md: 0 },
                px: { xs: 2, md: 0 },
            }}
        >
            <Box
                sx={{
                    width: { xs: "86vw", sm: 480, md: "100%" },
                    maxWidth: "100%",
                    aspectRatio: "5 / 2",
                    borderRadius: { xs: 2, md: 3 },
                    overflow: "hidden",
                }}
            >
                <Skeleton
                    variant="rectangular"
                    animation="wave"
                    sx={{
                        width: "100%",
                        height: "100%",
                        ...skeletonSurfaceSx,
                    }}
                />
            </Box>
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

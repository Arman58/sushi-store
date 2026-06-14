import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

export function HeroSectionSkeleton() {
    return (
        <Box
            sx={{
                position: "relative",
                mb: { xs: 0, sm: 4 },
                borderRadius: { xs: 0, sm: "24px" },
                minHeight: { xs: 380, sm: 420, md: 460 },
                overflow: "hidden",
                border: { xs: "none", sm: "1px solid" },
                borderColor: "divider",
            }}
        >
            <Skeleton
                variant="rectangular"
                animation="wave"
                sx={{
                    width: "100%",
                    height: "100%",
                    minHeight: { xs: 380, sm: 420, md: 460 },
                    borderRadius: { xs: 0, sm: "24px" },
                    ...skeletonSurfaceSx,
                }}
            />
            <Stack
                spacing={1.5}
                sx={{
                    position: "absolute",
                    inset: 0,
                    p: { xs: 3, sm: 4 },
                    pointerEvents: "none",
                }}
            >
                <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={140}
                    height={28}
                    sx={{ borderRadius: 999, ...skeletonSurfaceSx }}
                />
                <Skeleton
                    variant="text"
                    animation="wave"
                    width="72%"
                    height={48}
                    sx={skeletonSurfaceSx}
                />
                <Skeleton
                    variant="text"
                    animation="wave"
                    width="55%"
                    height={28}
                    sx={skeletonSurfaceSx}
                />
                <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                    <Skeleton
                        variant="rounded"
                        animation="wave"
                        width={120}
                        height={44}
                        sx={{ borderRadius: 999, ...skeletonSurfaceSx }}
                    />
                    <Skeleton
                        variant="rounded"
                        animation="wave"
                        width={120}
                        height={44}
                        sx={{ borderRadius: 999, ...skeletonSurfaceSx }}
                    />
                </Stack>
            </Stack>
        </Box>
    );
}

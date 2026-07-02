import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

const PILL_COUNT = 7;

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

export function CategoryPillsSkeleton() {
    return (
        <Container
            component="section"
            aria-busy="true"
            aria-label="Loading categories"
            sx={{
                ...sectionContainerSx,
                mt: { xs: 3, md: 5 },
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: { xs: 1.5, sm: 2 } }}
            >
                <Skeleton
                    variant="text"
                    animation="wave"
                    width={140}
                    height={32}
                    sx={skeletonSurfaceSx}
                />
                <Skeleton
                    variant="rounded"
                    animation="wave"
                    width={96}
                    height={24}
                    sx={{ borderRadius: "8px", ...skeletonSurfaceSx }}
                />
            </Stack>

            <Stack
                direction="row"
                spacing={1.5}
                sx={{
                    overflowX: "auto",
                    flexWrap: "nowrap",
                    py: 0.5,
                    mx: { xs: -2, md: 0 },
                    px: { xs: 2, md: 0 },
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                }}
            >
                {Array.from({ length: PILL_COUNT }).map((_, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flexShrink: 0,
                            width: { xs: 108, sm: 124 },
                        }}
                    >
                        <Skeleton
                            variant="circular"
                            animation="wave"
                            width={60}
                            height={60}
                            sx={skeletonSurfaceSx}
                        />
                        <Skeleton
                            variant="text"
                            animation="wave"
                            width="72%"
                            height={18}
                            sx={{ mt: 1, borderRadius: 1, ...skeletonSurfaceSx }}
                        />
                    </Box>
                ))}
            </Stack>
        </Container>
    );
}

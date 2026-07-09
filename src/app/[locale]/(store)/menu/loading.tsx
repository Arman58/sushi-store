import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { PageContainer } from "@/shared/ui";

import { MenuCatalogSkeleton } from "./menu-catalog-skeleton";

export default function MenuLoading() {
    return (
        <PageContainer>
            <Stack spacing={2} sx={{ mb: 2 }}>
                <Skeleton animation="wave" variant="text" width="40%" sx={{ fontSize: 32 }} />
                <Box sx={{ display: "flex", gap: 1, overflow: "hidden" }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            animation="wave"
                            variant="rounded"
                            width={88}
                            height={36}
                            sx={{ borderRadius: 999, flexShrink: 0 }}
                        />
                    ))}
                </Box>
            </Stack>
            <MenuCatalogSkeleton />
        </PageContainer>
    );
}

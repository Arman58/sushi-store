/**
 * Next.js route loading UI for /menu — hero shell + catalog skeleton grid.
 */

import Skeleton from "@mui/material/Skeleton";

import { PageContainer } from "@/shared/ui";
import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

import { MenuCatalogSkeleton } from "./menu-catalog-skeleton";

export default function MenuLoading() {
    return (
        <PageContainer>
            <Skeleton
                variant="rounded"
                animation="wave"
                height={160}
                sx={{ borderRadius: 4, mb: 4, ...skeletonSurfaceSx }}
            />

            <MenuCatalogSkeleton />
        </PageContainer>
    );
}

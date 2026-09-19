import Skeleton from "@mui/material/Skeleton";

import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

export function MenuHeroSkeleton() {
    return (
        <Skeleton
            variant="rounded"
            animation="wave"
            height={160}
            sx={{
                display: { xs: "none", md: "block" },
                borderRadius: 4,
                mb: 4,
                ...skeletonSurfaceSx,
            }}
        />
    );
}

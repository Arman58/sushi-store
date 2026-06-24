import Skeleton from "@mui/material/Skeleton";

import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";

export function MenuHeroSkeleton() {
    return (
        <Skeleton
            variant="rounded"
            animation="wave"
            height={160}
            sx={{ borderRadius: 4, mb: 4, ...skeletonSurfaceSx }}
        />
    );
}

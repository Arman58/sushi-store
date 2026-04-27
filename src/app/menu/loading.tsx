/**
 * Next.js streaming loading UI for /menu.
 * Shown automatically while the Server Component fetches data.
 * No "use client" needed — this is a server component boundary.
 */

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

import { PageContainer } from "@/shared/ui";
import { MenuSectionSkeleton } from "@/widgets/menu-section/menu-section-skeleton";

export default function MenuLoading() {
    return (
        <main>
            <PageContainer>
                {/* Hero banner skeleton */}
                <Skeleton
                    variant="rounded"
                    height={160}
                    sx={{ borderRadius: 4, mb: 4 }}
                />

                {/* Section title skeleton */}
                <Skeleton variant="text" width={120} height={40} sx={{ mb: 3 }} />

                {/* Menu grid skeleton */}
                <MenuSectionSkeleton />
            </PageContainer>
        </main>
    );
}

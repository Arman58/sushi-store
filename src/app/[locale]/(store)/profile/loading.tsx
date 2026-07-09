import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { PageContainer } from "@/shared/ui";

export default function ProfileLoading() {
    return (
        <PageContainer>
            <Skeleton animation="wave" variant="text" width="35%" sx={{ fontSize: 32, mb: 2 }} />
            <Stack spacing={1.5}>
                <Skeleton animation="wave" variant="rounded" height={72} sx={{ borderRadius: 2 }} />
                <Skeleton animation="wave" variant="rounded" height={72} sx={{ borderRadius: 2 }} />
                <Skeleton animation="wave" variant="rounded" height={120} sx={{ borderRadius: 2 }} />
                <Skeleton animation="wave" variant="rounded" height={120} sx={{ borderRadius: 2 }} />
            </Stack>
        </PageContainer>
    );
}

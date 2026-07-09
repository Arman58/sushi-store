import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { PageContainer } from "@/shared/ui";

export default function CartLoading() {
    return (
        <PageContainer>
            <Skeleton animation="wave" variant="text" width="30%" sx={{ fontSize: 32, mb: 2 }} />
            <Stack spacing={1.5}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        animation="wave"
                        variant="rounded"
                        height={88}
                        sx={{ borderRadius: 2 }}
                    />
                ))}
                <Skeleton
                    animation="wave"
                    variant="rounded"
                    height={140}
                    sx={{ borderRadius: 2, mt: 1 }}
                />
            </Stack>
        </PageContainer>
    );
}

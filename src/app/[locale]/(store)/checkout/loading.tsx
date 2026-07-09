import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { PageContainer } from "@/shared/ui";

export default function CheckoutLoading() {
    return (
        <PageContainer>
            <Skeleton animation="wave" variant="text" width="45%" sx={{ fontSize: 32, mb: 2 }} />
            <Stack spacing={2}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        animation="wave"
                        variant="rounded"
                        height={i === 3 ? 160 : 96}
                        sx={{ borderRadius: 2 }}
                    />
                ))}
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Skeleton
                        animation="wave"
                        variant="rounded"
                        width={180}
                        height={48}
                        sx={{ borderRadius: 2 }}
                    />
                </Box>
            </Stack>
        </PageContainer>
    );
}

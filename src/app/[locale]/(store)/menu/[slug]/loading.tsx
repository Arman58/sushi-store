import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { PageContainer } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

/**
 * Скелетон страницы товара (route-level loading).
 * Зеркалит раскладку ProductPageView: крошки → фото 4:3 → заголовок →
 * рейтинг → цена → описание, плюс sticky-бар «в корзину» снизу.
 * Убирает пустой экран при переходе на товар (меньше ощущаемая задержка).
 */
export default function ProductPageLoading() {
    return (
        <PageContainer>
            <Box
                aria-hidden
                sx={{
                    maxWidth: 560,
                    mx: "auto",
                    pb: {
                        xs: "calc(96px + env(safe-area-inset-bottom) + 72px)",
                        sm: "calc(88px + env(safe-area-inset-bottom))",
                    },
                }}
            >
                {/* Хлебные крошки */}
                <Skeleton
                    animation="wave"
                    variant="text"
                    width="55%"
                    sx={{ fontSize: 14, mb: 2 }}
                />

                {/* Фото товара */}
                <Skeleton
                    animation="wave"
                    variant="rounded"
                    sx={{
                        width: "100%",
                        aspectRatio: "4 / 3",
                        borderRadius: `${tokens.radiusCardLg}px`,
                    }}
                />

                {/* Заголовок */}
                <Skeleton
                    animation="wave"
                    variant="text"
                    width="72%"
                    sx={{ fontSize: 30, mt: 2.5 }}
                />

                {/* Рейтинг */}
                <Skeleton
                    animation="wave"
                    variant="rounded"
                    width={130}
                    height={22}
                    sx={{ mt: 1, borderRadius: 999 }}
                />

                {/* Цена */}
                <Skeleton
                    animation="wave"
                    variant="text"
                    width={110}
                    sx={{ fontSize: 28, mt: 2 }}
                />

                {/* Описание */}
                <Stack spacing={0.75} sx={{ mt: 2 }}>
                    <Skeleton animation="wave" variant="text" width="100%" />
                    <Skeleton animation="wave" variant="text" width="100%" />
                    <Skeleton animation="wave" variant="text" width="80%" />
                </Stack>
            </Box>

            {/* Sticky-бар «в корзину» */}
            <Box
                aria-hidden
                sx={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1100,
                    px: { xs: 2, sm: 3 },
                    pt: 1.5,
                    pb: "calc(12px + env(safe-area-inset-bottom))",
                    bgcolor: "background.paper",
                    borderTop: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Box
                    sx={{
                        maxWidth: 560,
                        mx: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                    }}
                >
                    <Skeleton
                        animation="wave"
                        variant="rounded"
                        width={128}
                        height={48}
                        sx={{ borderRadius: 2, flexShrink: 0 }}
                    />
                    <Skeleton
                        animation="wave"
                        variant="rounded"
                        height={48}
                        sx={{ flex: 1, borderRadius: 2 }}
                    />
                </Box>
            </Box>
        </PageContainer>
    );
}

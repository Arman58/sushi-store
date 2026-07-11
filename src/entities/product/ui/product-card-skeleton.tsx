"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";

import { skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";
import { tokens } from "@/shared/ui/theme";

import { STEPPER_SIZE, STEPPER_SIZE_XS } from "./product-card-shared";

export function ProductCardSkeleton() {
    return (
        <Box sx={{ width: "100%", height: "100%", minWidth: 0 }}>
            <Card
                component="article"
                elevation={1}
                sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: `${tokens.radiusCardLg}px`,
                    overflow: "hidden",
                    bgcolor: "background.paper",
                }}
            >
                <Skeleton
                    variant="rectangular"
                    animation="wave"
                    sx={{
                        width: "100%",
                        aspectRatio: "4 / 3",
                        flexShrink: 0,
                        transform: "none",
                        ...skeletonSurfaceSx,
                    }}
                />
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        overflow: "hidden",
                        pt: 1.5,
                        px: 1.5,
                    }}
                >
                    <Skeleton
                        variant="text"
                        animation="wave"
                        width="88%"
                        sx={{ borderRadius: 1, ...skeletonSurfaceSx }}
                    />
                    <Skeleton
                        variant="text"
                        animation="wave"
                        width="70%"
                        sx={{ borderRadius: 1, mt: 0.5, ...skeletonSurfaceSx }}
                    />
                </Box>
                <Box
                    sx={{
                        mt: "auto",
                        pt: 1,
                        pb: 1.5,
                        px: 1.5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                    }}
                >
                    <Skeleton
                        variant="text"
                        animation="wave"
                        width="38%"
                        sx={{
                            borderRadius: 1,
                            flex: 1,
                            minWidth: 0,
                            ...skeletonSurfaceSx,
                        }}
                    />
                    <Skeleton
                        variant="circular"
                        animation="wave"
                        sx={{
                            flexShrink: 0,
                            width: { xs: STEPPER_SIZE_XS, sm: STEPPER_SIZE },
                            height: { xs: STEPPER_SIZE_XS, sm: STEPPER_SIZE },
                            ...skeletonSurfaceSx,
                        }}
                    />
                </Box>
            </Card>
        </Box>
    );
}

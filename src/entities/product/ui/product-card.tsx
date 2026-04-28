"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { memo, useState } from "react";

import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { skeletonShimmerSx, tokens } from "@/shared/ui/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductBadge = "hit" | "new" | "spicy" | "discount";

export type ProductCardProps = {
    name: string;
    description?: string | null;
    categoryName?: string;
    composition?: string;
    price: number;
    originalPrice?: number | null;
    weight?: number | null;
    images?: unknown;
    mainImage?: string | null;
    badges?: ProductBadge[];
    onAddToCart: () => void;
    quantity?: number;
    onIncrease?: () => void;
    onDecrease?: () => void;
    index?: number;
    /** Prefer preloading this card image — use once per viewport for LCP (e.g. first tile on home). */
    imagePriority?: boolean;
};

const fmt = new Intl.NumberFormat("ru-RU");

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
    name,
    composition,
    price,
    images,
    mainImage,
    onAddToCart,
    quantity = 0,
    onIncrease,
    onDecrease,
    imagePriority = false,
}: ProductCardProps) {
    const [imgLoaded, setImgLoaded] = useState(false);

    const imageUrl = getProductCoverUrl({ images, mainImage });

    const hasInCart = quantity > 0;

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart();
    };

    return (
        <Box sx={{ width: "100%", height: "100%" }}>
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 3,
                    overflow: "hidden",
                    bgcolor: "#fff",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "box-shadow 0.28s ease",
                    "&:hover": {
                        boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
                    },
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
                        bgcolor: tokens.surfaceHi,
                    }}
                >
                    {!imgLoaded && (
                        <Skeleton
                            variant="rectangular"
                            sx={{
                                position: "absolute",
                                inset: 0,
                                height: "100%",
                                transform: "none",
                                ...skeletonShimmerSx,
                            }}
                        />
                    )}

                    <Image
                        src={imageUrl || "/placeholder.png"}
                        alt={name}
                        fill
                        sizes="(max-width: 600px) 50vw, 25vw"
                        style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                        }}
                        {...(imagePriority
                            ? { priority: true, fetchPriority: "high" as const }
                            : { loading: "lazy" })}
                        onLoad={() => setImgLoaded(true)}
                    />
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        pt: 1.5,
                        px: 1.5,
                        pb: 1.5,
                        minHeight: 0,
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: "text.primary",
                            lineHeight: 1.25,
                            mb: composition?.trim() ? 0 : 1,
                        }}
                    >
                        {name}
                    </Typography>

                    {composition?.trim() ? (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                mt: 0.5,
                                mb: 1,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {composition.trim()}
                        </Typography>
                    ) : null}

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: "auto",
                            gap: 1,
                            minWidth: 0,
                        }}
                    >
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: "0.85rem", sm: "1rem" },
                                whiteSpace: "nowrap",
                                lineHeight: 1,
                                color: "text.primary",
                                letterSpacing: -0.02,
                                minWidth: 0,
                            }}
                        >
                            {fmt.format(price)}&thinsp;֏
                        </Typography>

                        {hasInCart ? (
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.5}
                                sx={{ flexShrink: 0, ml: "auto" }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDecrease?.();
                                    }}
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        backgroundColor: "action.hover",
                                        color: "text.secondary",
                                        transition:
                                            "color 0.15s ease, background-color 0.15s ease",
                                        "&:hover": {
                                            bgcolor: "action.selected",
                                        },
                                        "&:active": {
                                            transform: "scale(0.92)",
                                        },
                                    }}
                                >
                                    <RemoveIcon sx={{ fontSize: 20 }} />
                                </IconButton>

                                <Typography
                                    sx={{
                                        fontSize: "0.9rem",
                                        fontWeight: 700,
                                        minWidth: 22,
                                        textAlign: "center",
                                        color: "text.primary",
                                        lineHeight: 1,
                                    }}
                                >
                                    {quantity}
                                </Typography>

                                <Box
                                    sx={{
                                        display: "inline-flex",
                                        borderRadius: "50%",
                                    }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onIncrease?.();
                                        }}
                                        aria-label="Добавить ещё"
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            backgroundColor: "action.hover",
                                            color: "text.secondary",
                                            borderRadius: "50%",
                                            transition:
                                                "color 0.15s ease, background-color 0.15s ease",
                                            "&:hover": {
                                                bgcolor: "action.selected",
                                            },
                                            "&:active": {
                                                transform: "scale(0.92)",
                                            },
                                        }}
                                    >
                                        <AddIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Box>
                            </Stack>
                        ) : (
                            <Box
                                sx={{
                                    display: "inline-flex",
                                    borderRadius: "50%",
                                    flexShrink: 0,
                                }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={handleAdd}
                                    aria-label={`Добавить ${name}`}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        backgroundColor: "primary.main",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        boxShadow:
                                            "0 2px 8px rgba(232, 93, 74, 0.35)",
                                        transition:
                                            "background-color 0.18s ease, box-shadow 0.18s ease",
                                        "&:hover": {
                                            backgroundColor: "primary.dark",
                                        },
                                        "&:active": {
                                            transform: "scale(0.92)",
                                        },
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: 22, color: "#fff" }} />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Skeleton
                variant="rectangular"
                sx={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    transform: "none",
                    ...skeletonShimmerSx,
                }}
            />
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    pt: 1.5,
                    px: 1.5,
                    pb: 1.5,
                    minHeight: 0,
                }}
            >
                <Skeleton
                    variant="text"
                    width="88%"
                    sx={{ borderRadius: 1, ...skeletonShimmerSx }}
                />
                <Box
                    sx={{
                        mt: "auto",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Skeleton
                        variant="text"
                        width="40%"
                        sx={{ borderRadius: 1, ...skeletonShimmerSx }}
                    />
                    <Skeleton
                        variant="circular"
                        width={40}
                        height={40}
                        sx={{ ...skeletonShimmerSx }}
                    />
                </Box>
            </Box>
        </Box>
    );
}

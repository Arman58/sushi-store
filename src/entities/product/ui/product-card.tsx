"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { memo } from "react";

import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { buildProductImageAlt } from "@/shared/lib/product-image-alt";
import { ProductCoverImage } from "@/shared/ui/product-cover-image";
import { tokens } from "@/shared/ui/theme";

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

const cardHoverShadow =
    `0 8px 24px ${alpha(tokens.textPrimary, 0.08)}, 0 22px 52px ${alpha(tokens.textPrimary, 0.14)}`;

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
    const imageUrl = getProductCoverUrl({ images, mainImage });
    const imageAlt = buildProductImageAlt(name);

    const hasInCart = quantity > 0;

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart();
    };

    return (
        <Box sx={{ width: "100%", height: "100%" }}>
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
                    cursor: "pointer",
                    bgcolor: "background.paper",
                    transition:
                        "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                    "@media (hover: hover) and (pointer: fine)": {
                        "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: cardHoverShadow,
                        },
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
                    <ProductCoverImage
                        src={imageUrl}
                        alt={imageAlt}
                        priority={imagePriority}
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
                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color: "text.primary",
                                lineHeight: 1.25,
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
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {composition.trim()}
                            </Typography>
                        ) : null}
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: "auto",
                            pt: 1,
                            gap: 1,
                            minWidth: 0,
                            flexShrink: 0,
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
                                fontVariantNumeric: "tabular-nums",
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
                                    aria-label={`Уменьшить количество: ${name}`}
                                    sx={{
                                        width: 44,
                                        height: 44,
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
                                        aria-label={`Увеличить количество: ${name}`}
                                        sx={{
                                            width: 44,
                                            height: 44,
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
                                        width: 44,
                                        height: 44,
                                        backgroundColor: "primary.main",
                                        color: "primary.contrastText",
                                        borderRadius: "50%",
                                        boxShadow: `0 2px 8px ${alpha(tokens.brand, 0.35)}`,
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
                                    <AddIcon
                                        sx={{ fontSize: 22, color: "primary.contrastText" }}
                                    />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Card>
        </Box>
    );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
    return (
        <Box sx={{ width: "100%", height: "100%" }}>
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
                    aspectRatio: "1 / 1",
                    transform: "none",
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
                    animation="wave"
                    width="88%"
                    sx={{ borderRadius: 1 }}
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
                        animation="wave"
                        width="40%"
                        sx={{ borderRadius: 1 }}
                    />
                    <Skeleton
                        variant="circular"
                        animation="wave"
                        width={40}
                        height={40}
                    />
                </Box>
            </Box>
            </Card>
        </Box>
    );
}

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
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { buildProductImageAlt } from "@/shared/lib/product-image-alt";
import { fadeInSx, skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";
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
    /** Prefer preloading this card image - use once per viewport for LCP (e.g. first tile on home). */
    imagePriority?: boolean;
};

const cardHoverShadow =
    `0 8px 24px ${alpha(tokens.textPrimary, 0.08)}, 0 22px 52px ${alpha(tokens.textPrimary, 0.14)}`;

const STEPPER_SIZE = 36;

const stepperButtonSx = {
    flexShrink: 0,
    p: 0,
    width: STEPPER_SIZE,
    height: STEPPER_SIZE,
    minWidth: STEPPER_SIZE,
    minHeight: STEPPER_SIZE,
    maxWidth: STEPPER_SIZE,
    maxHeight: STEPPER_SIZE,
    borderRadius: "50%",
} as const;

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
    const t = useTranslations("product");
    const locale = useLocale();
    const imageUrl = getProductCoverUrl({ images, mainImage });
    const imageAlt = buildProductImageAlt(name, locale);

    const hasInCart = quantity > 0;

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart();
    };

    return (
        <Box sx={{ width: "100%", height: "100%", minWidth: 0, ...fadeInSx }}>
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
                {/* 1. Image - fixed aspect ratio, never stretches the card */}
                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        flexShrink: 0,
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

                {/* 2. Content - name + description, grows within card */}
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        pt: 1.5,
                        px: 1.5,
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 700,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
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
                                lineHeight: 1.35,
                            }}
                        >
                            {composition.trim()}
                        </Typography>
                    ) : null}
                </Box>

                {/* 3. Footer - price truncates before action controls */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        flexWrap: "nowrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: "auto",
                        gap: 1,
                        minWidth: 0,
                        flexShrink: 0,
                        width: "100%",
                        px: 1.5,
                        pb: 1.5,
                        pt: 1,
                    }}
                >
                    <Typography
                        component="span"
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            fontWeight: 800,
                            fontSize: { xs: "0.8rem", sm: "0.95rem" },
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: 1,
                            color: "text.primary",
                            letterSpacing: -0.02,
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {formatStorePrice(price)}&thinsp;֏
                    </Typography>

                    {hasInCart ? (
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.25}
                            sx={{ flexShrink: 0 }}
                        >
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDecrease?.();
                                }}
                                aria-label={t("aria.decrease", { name })}
                                sx={{
                                    ...stepperButtonSx,
                                    bgcolor: "action.hover",
                                    color: "text.secondary",
                                    "&:hover": { bgcolor: "action.selected" },
                                    "&:active": { transform: "scale(0.92)" },
                                }}
                            >
                                <RemoveIcon sx={{ fontSize: 20 }} />
                            </IconButton>

                            <Typography
                                sx={{
                                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                    fontWeight: 700,
                                    minWidth: 20,
                                    textAlign: "center",
                                    color: "text.primary",
                                    lineHeight: 1,
                                    fontVariantNumeric: "tabular-nums",
                                    flexShrink: 0,
                                }}
                            >
                                {quantity}
                            </Typography>

                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onIncrease?.();
                                }}
                                aria-label={t("aria.increase", { name })}
                                sx={{
                                    ...stepperButtonSx,
                                    bgcolor: "action.hover",
                                    color: "text.secondary",
                                    "&:hover": { bgcolor: "action.selected" },
                                    "&:active": { transform: "scale(0.92)" },
                                }}
                            >
                                <AddIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Stack>
                    ) : (
                        <IconButton
                            size="small"
                            onClick={handleAdd}
                            aria-label={t("aria.add", { name })}
                            sx={{
                                ...stepperButtonSx,
                                flexShrink: 0,
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                boxShadow: `0 2px 8px ${alpha(tokens.brand, 0.35)}`,
                                "&:hover": { bgcolor: "primary.dark" },
                                "&:active": { transform: "scale(0.92)" },
                            }}
                        >
                            <AddIcon
                                sx={{
                                    fontSize: 22,
                                    color: "primary.contrastText",
                                }}
                            />
                        </IconButton>
                    )}
                </Box>
            </Card>
        </Box>
    );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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
                        sx={{ borderRadius: 1, flex: 1, minWidth: 0, ...skeletonSurfaceSx }}
                    />
                    <Skeleton
                        variant="circular"
                        animation="wave"
                        width={STEPPER_SIZE}
                        height={STEPPER_SIZE}
                        sx={{ flexShrink: 0, ...skeletonSurfaceSx }}
                    />
                </Box>
            </Card>
        </Box>
    );
}

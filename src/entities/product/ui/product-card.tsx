"use client";

import AddIcon from "@mui/icons-material/Add";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

import { useIsFavorite } from "@/features/favorites";
import { Link } from "@/i18n/server";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { buildProductImageAlt } from "@/shared/lib/product-image-alt";
import { ProductCoverImage } from "@/shared/ui/product-cover-image";
import { fadeInSx, skeletonSurfaceSx } from "@/shared/ui/skeleton-styles";
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
    /** SEO-страница товара; фото и название ведут на неё. */
    productHref?: string;
    onAddToCart: () => void;
    onOpenDetails?: () => void;
    quantity?: number;
    onIncrease?: () => void;
    onDecrease?: () => void;
    index?: number;
    /** Prefer preloading this card image - use once per viewport for LCP (e.g. first tile on home). */
    imagePriority?: boolean;
    /** Product ID – used for localStorage-based favorites. */
    productId?: number;
    /** Реальный средний рейтинг из отзывов (0 - отзывов нет). */
    ratingAvg?: number;
    /** Кол-во отзывов. */
    ratingCount?: number;
};

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_STYLE: Record<
    ProductBadge,
    { bg: string; color: string }
> = {
    hit:      { bg: "#2D3436", color: "#FFFFFF" },
    new:      { bg: "#27AE60", color: "#FFFFFF" },
    spicy:    { bg: "#E67E22", color: "#FFFFFF" },
    discount: { bg: "#E74C3C", color: "#FFFFFF" },
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPPER_SIZE = 40;

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
    description,
    composition,
    price,
    originalPrice,
    images,
    mainImage,
    badges,
    productHref,
    onAddToCart,
    onOpenDetails,
    quantity = 0,
    onIncrease,
    onDecrease,
    imagePriority = false,
    productId,
    ratingAvg = 0,
    ratingCount = 0,
}: ProductCardProps) {
    const t = useTranslations("product");
    const locale = useLocale();
    const imageUrl = getProductCoverUrl({ images, mainImage });
    const imageAlt = buildProductImageAlt(name, locale);
    const previewText = (description ?? composition)?.trim() ?? "";

    const hasInCart = quantity > 0;
    const productLink = productHref?.trim() || null;
    const hasProductLink = Boolean(productLink);
    const formattedPrice = `${formatStorePrice(price)} ֏`;
    const productLinkAriaLabel = t("aria.viewProductWithPrice", {
        name,
        price: formattedPrice,
    });

    // Favorites (общий store — синхронизирован с хедером и страницей избранного)
    const { isFavorite, toggle: toggleFavorite } = useIsFavorite(productId);

    // Реальный рейтинг из отзывов; блок показывается только при наличии отзывов
    const hasRating = ratingCount > 0 && ratingAvg > 0;

    // Discount calculation
    const hasDiscount =
        originalPrice != null && originalPrice > 0 && originalPrice > price;
    const discountPercent = hasDiscount
        ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
        : 0;

    // Badge data for rendering
    const badgeEntries: {
        key: ProductBadge;
        label: string;
        bg: string;
        color: string;
    }[] = [];

    if (badges?.length) {
        for (const b of badges) {
            if (b === "discount") {
                if (hasDiscount) {
                    badgeEntries.push({
                        key: "discount",
                        label: `-${discountPercent}%`,
                        ...BADGE_STYLE.discount,
                    });
                }
            } else {
                const labelMap: Record<string, string> = {
                    hit: t("badge.hit"),
                    new: t("badge.new"),
                    spicy: t("badge.spicy"),
                };
                badgeEntries.push({
                    key: b,
                    label: labelMap[b] ?? b,
                    ...BADGE_STYLE[b],
                });
            }
        }
    }

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart();
    };

    const handleOpenDetails = () => {
        onOpenDetails?.();
    };

    const handleOpenDetailsKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenDetails();
        }
    };

    const linkSx = {
        display: "block",
        textDecoration: "none",
        color: "inherit",
        outline: "none",
        "&:focus-visible": {
            boxShadow: (theme: { palette: { primary: { main: string } } }) =>
                `inset 0 0 0 2px ${theme.palette.primary.main}`,
        },
    } as const;

    // ── Image area (shared between link & non-link variants) ──
    const imageArea = (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "4 / 3",
                flexShrink: 0,
                overflow: "hidden",
                bgcolor: tokens.surfaceHi,
                borderTopLeftRadius: `${tokens.radiusCardLg}px`,
                borderTopRightRadius: `${tokens.radiusCardLg}px`,
            }}
        >
            <ProductCoverImage
                src={imageUrl}
                alt={imageAlt}
                priority={imagePriority}
            />

            {/* Badges – top-left */}
            {badgeEntries.length > 0 && (
                <Stack
                    direction="column"
                    spacing={0.5}
                    sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        zIndex: 1,
                    }}
                >
                    {badgeEntries.map((b) => (
                        <Box
                            key={b.key}
                            sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                px: 1,
                                py: 0.25,
                                borderRadius: 1.5,
                                backgroundColor: b.bg,
                                color: b.color,
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                lineHeight: 1.3,
                                letterSpacing: 0.02,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {b.label}
                        </Box>
                    ))}
                </Stack>
            )}

            {/* Favorite heart – top-right */}
            {productId !== undefined && (
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleFavorite();
                    }}
                    aria-label={
                        isFavorite
                            ? t("aria.removeFromFavorites", { name })
                            : t("aria.addToFavorites", { name })
                    }
                    sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        zIndex: 1,
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        minHeight: 36,
                        bgcolor: "rgba(255,255,255,0.92)",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                        color: isFavorite ? "#E74C3C" : "#999999",
                        "&:hover": {
                            bgcolor: "rgba(255,255,255,1)",
                            color: isFavorite ? "#C0392B" : "#E74C3C",
                        },
                        "&:active": { transform: "scale(0.88)" },
                        transition: "color 0.18s ease, transform 0.12s ease, background-color 0.18s ease",
                    }}
                >
                    {isFavorite ? (
                        <FavoriteOutlinedIcon sx={{ fontSize: 18 }} />
                    ) : (
                        <FavoriteBorderOutlinedIcon sx={{ fontSize: 18 }} />
                    )}
                </IconButton>
            )}
        </Box>
    );

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
                    bgcolor: "background.paper",
                }}
            >
                <Box
                    role={!hasProductLink && onOpenDetails ? "button" : undefined}
                    tabIndex={!hasProductLink && onOpenDetails ? 0 : undefined}
                    aria-label={
                        !hasProductLink && onOpenDetails
                            ? t("aria.openDetails", { name })
                            : undefined
                    }
                    onClick={
                        !hasProductLink && onOpenDetails
                            ? handleOpenDetails
                            : undefined
                    }
                    onKeyDown={
                        !hasProductLink && onOpenDetails
                            ? handleOpenDetailsKeyDown
                            : undefined
                    }
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        cursor:
                            !hasProductLink && onOpenDetails ? "pointer" : undefined,
                        outline: "none",
                        "&:focus-visible":
                            !hasProductLink && onOpenDetails
                                ? {
                                      boxShadow: (theme) =>
                                          `inset 0 0 0 2px ${theme.palette.primary.main}`,
                                  }
                                : undefined,
                    }}
                >
                {/* 1. Image (with badges & favorite) */}
                {hasProductLink ? (
                    <Box
                        component={Link}
                        href={productLink!}
                        aria-label={productLinkAriaLabel}
                        sx={{
                            ...linkSx,
                            position: "relative",
                            width: "100%",
                            aspectRatio: "4 / 3",
                            flexShrink: 0,
                            overflow: "hidden",
                            bgcolor: tokens.surfaceHi,
                            borderTopLeftRadius: `${tokens.radiusCardLg}px`,
                            borderTopRightRadius: `${tokens.radiusCardLg}px`,
                        }}
                    >
                        <ProductCoverImage
                            src={imageUrl}
                            alt={imageAlt}
                            priority={imagePriority}
                        />

                        {/* Badges – top-left */}
                        {badgeEntries.length > 0 && (
                            <Stack
                                direction="column"
                                spacing={0.5}
                                sx={{
                                    position: "absolute",
                                    top: 8,
                                    left: 8,
                                    zIndex: 1,
                                }}
                            >
                                {badgeEntries.map((b) => (
                                    <Box
                                        key={b.key}
                                        sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1.5,
                                            backgroundColor: b.bg,
                                            color: b.color,
                                            fontSize: "0.6875rem",
                                            fontWeight: 700,
                                            lineHeight: 1.3,
                                            letterSpacing: 0.02,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {b.label}
                                    </Box>
                                ))}
                            </Stack>
                        )}

                        {/* Favorite heart – top-right */}
                        {productId !== undefined && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    toggleFavorite();
                                }}
                                aria-label={
                                    isFavorite
                                        ? t("aria.removeFromFavorites", { name })
                                        : t("aria.addToFavorites", { name })
                                }
                                sx={{
                                    position: "absolute",
                                    top: 6,
                                    right: 6,
                                    zIndex: 1,
                                    width: 36,
                                    height: 36,
                                    minWidth: 36,
                                    minHeight: 36,
                                    bgcolor: "rgba(255,255,255,0.92)",
                                    backdropFilter: "blur(4px)",
                                    WebkitBackdropFilter: "blur(4px)",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                                    color: isFavorite ? "#E74C3C" : "#999999",
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,1)",
                                        color: isFavorite ? "#C0392B" : "#E74C3C",
                                    },
                                    "&:active": { transform: "scale(0.88)" },
                                    transition:
                                        "color 0.18s ease, transform 0.12s ease, background-color 0.18s ease",
                                }}
                            >
                                {isFavorite ? (
                                    <FavoriteOutlinedIcon sx={{ fontSize: 18 }} />
                                ) : (
                                    <FavoriteBorderOutlinedIcon sx={{ fontSize: 18 }} />
                                )}
                            </IconButton>
                        )}
                    </Box>
                ) : (
                    imageArea
                )}

                {/* 2. Content - name + description */}
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
                    {hasProductLink ? (
                        <Typography
                            component={Link}
                            href={productLink!}
                            variant="body2"
                            sx={{
                                ...linkSx,
                                fontWeight: 700,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                color: "text.primary",
                                lineHeight: 1.25,
                                "&:hover": { color: "primary.main" },
                            }}
                        >
                            {name}
                        </Typography>
                    ) : (
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
                    )}

                    {previewText ? (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                                mt: 0.5,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                lineHeight: 1.4,
                            }}
                        >
                            {previewText}
                        </Typography>
                    ) : null}

                    {/* Rating + delivery time */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ mt: 0.75 }}
                    >
                        {hasRating && (
                            <>
                                <StarIcon
                                    sx={{
                                        fontSize: 14,
                                        color: "#FFB800",
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: "0.75rem",
                                        color: tokens.textSecondary,
                                        lineHeight: 1,
                                    }}
                                >
                                    {ratingAvg}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: tokens.textMuted,
                                        fontSize: "0.75rem",
                                        lineHeight: 1,
                                    }}
                                >
                                    ({ratingCount})
                                </Typography>
                            </>
                        )}
                        <Typography
                            variant="caption"
                            sx={{
                                color: tokens.textMuted,
                                fontSize: "0.75rem",
                                lineHeight: 1,
                                ml: hasRating ? 1 : 0,
                            }}
                        >
                            {t("deliveryTime")}
                        </Typography>
                    </Stack>
                </Box>
                </Box>

                {/* 3. Footer - price + action controls */}
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
                    <Stack
                        direction="row"
                        alignItems="baseline"
                        spacing={0.75}
                        sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}
                    >
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: "0.9rem", sm: "1.05rem" },
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
                        {hasDiscount && (
                            <Typography
                                component="span"
                                sx={{
                                    fontWeight: 500,
                                    fontSize: { xs: "0.7rem", sm: "0.8rem" },
                                    whiteSpace: "nowrap",
                                    color: tokens.textMuted,
                                    textDecoration: "line-through",
                                    lineHeight: 1,
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {formatStorePrice(originalPrice!)}&thinsp;֏
                            </Typography>
                        )}
                    </Stack>

                    <AnimatePresence mode="wait" initial={false}>
                        {hasInCart ? (
                            <motion.div
                                key="stepper"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                style={{ flexShrink: 0 }}
                            >
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
                                        component={motion.span}
                                        key={quantity}
                                        initial={{ scale: 1.25, opacity: 0.6 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.15 }}
                                        sx={{
                                            fontSize: { xs: "0.8rem", sm: "0.875rem" },
                                            fontWeight: 700,
                                            minWidth: 20,
                                            textAlign: "center",
                                            color: "text.primary",
                                            lineHeight: 1,
                                            fontVariantNumeric: "tabular-nums",
                                            flexShrink: 0,
                                            display: "inline-block",
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
                            </motion.div>
                        ) : (
                            <motion.div
                                key="add"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                style={{ flexShrink: 0 }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={handleAdd}
                                    aria-label={t("aria.add", { name })}
                                    sx={{
                                        ...stepperButtonSx,
                                        flexShrink: 0,
                                        bgcolor: "#FFFFFF",
                                        border: `1.5px solid ${tokens.brand}`,
                                        color: tokens.brand,
                                        transition:
                                            "background-color 0.18s ease, color 0.18s ease, transform 0.12s ease",
                                        "&:hover": {
                                            bgcolor: tokens.brand,
                                            color: "#FFFFFF",
                                            boxShadow: `0 2px 8px ${alpha(tokens.brand, 0.35)}`,
                                        },
                                        "&:active": { transform: "scale(0.92)" },
                                    }}
                                >
                                    <AddIcon
                                        sx={{
                                            fontSize: 22,
                                            color: "inherit",
                                        }}
                                    />
                                </IconButton>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
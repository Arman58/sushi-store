"use client";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import { memo } from "react";

import { useIsFavorite } from "@/features/favorites";
import { Link } from "@/i18n/server";
import { DELIVERY_ETA } from "@/lib/site-config";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { buildProductImageAlt } from "@/shared/lib/product-image-alt";
import { fadeInSx } from "@/shared/ui/skeleton-styles";
import { tokens } from "@/shared/ui/theme";

import { ProductCardFooter } from "./product-card-footer";
import { ProductCardMedia } from "./product-card-media";
import {
    BADGE_STYLE,
    type BadgeEntry,
    type ProductCardProps,
} from "./product-card-shared";

// re-export для обратной совместимости импортов
export type { ProductBadge, ProductCardProps } from "./product-card-shared";
export { ProductCardSkeleton } from "./product-card-skeleton";

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
    isAvailable = true,
    maxQtyReached = false,
}: ProductCardProps) {
    const t = useTranslations("product");
    const locale = useLocale();
    const imageUrl = getProductCoverUrl({ images, mainImage });
    const imageAlt = buildProductImageAlt(name, locale);
    const previewText = (description ?? composition)?.trim() ?? "";

    const productLink = productHref?.trim() || null;
    const hasProductLink = Boolean(productLink);
    const formattedPrice = `${formatStorePrice(price)} ֏`;
    const productLinkAriaLabel = t("aria.viewProductWithPrice", {
        name,
        price: formattedPrice,
    });

    // Favorites (общий store - синхронизирован с хедером и страницей избранного)
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
    const badgeEntries: BadgeEntry[] = [];

    if (!isAvailable) {
        badgeEntries.push({
            key: "soldout",
            label: t("badge.soldOut"),
            bg: "#9AA0A6",
            color: "#FFFFFF",
        });
    }

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
        if (!isAvailable) return;
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

    const media = (
        <ProductCardMedia
            href={hasProductLink ? productLink : null}
            ariaLabel={hasProductLink ? productLinkAriaLabel : undefined}
            imageUrl={imageUrl}
            imageAlt={imageAlt}
            imagePriority={imagePriority}
            badges={badgeEntries}
            showFavorite={productId !== undefined}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            favoriteAriaLabel={
                isFavorite
                    ? t("aria.removeFromFavorites", { name })
                    : t("aria.addToFavorites", { name })
            }
        />
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
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "@media (hover: hover) and (pointer: fine)": {
                        "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: `0 12px 28px rgba(var(--ew-text-rgb), 0.12)`,
                        },
                    },
                }}
            >
                <Box
                    {...(hasProductLink
                        ? { component: Link, href: productLink! }
                        : { component: "div" })}
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
                            hasProductLink || onOpenDetails ? "pointer" : undefined,
                        outline: "none",
                        textDecoration: "none",
                        color: "inherit",
                        "&:focus-visible":
                            hasProductLink || onOpenDetails
                                ? {
                                      boxShadow: (theme) =>
                                          `inset 0 0 0 2px ${theme.palette.primary.main}`,
                                  }
                                : undefined,
                    }}
                >
                    {/* 1. Image (with badges & favorite) */}
                    {media}

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
                            <AccessTimeRoundedIcon
                                sx={{
                                    fontSize: 12,
                                    color: tokens.textMuted,
                                    flexShrink: 0,
                                    ml: hasRating ? 0.75 : 0,
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    color: tokens.textMuted,
                                    fontSize: "0.75rem",
                                    lineHeight: 1,
                                }}
                            >
                                {t("deliveryTime", {
                                    min: DELIVERY_ETA.minMinutes,
                                    max: DELIVERY_ETA.maxMinutes,
                                })}
                            </Typography>
                        </Stack>
                    </Box>
                </Box>

                {/* 3. Footer - price + action controls */}
                <ProductCardFooter
                    name={name}
                    price={price}
                    originalPrice={originalPrice}
                    hasDiscount={hasDiscount}
                    quantity={quantity}
                    isAvailable={isAvailable}
                    maxQtyReached={maxQtyReached}
                    onAdd={handleAdd}
                    onIncrease={onIncrease}
                    onDecrease={onDecrease}
                />
            </Card>
        </Box>
    );
});

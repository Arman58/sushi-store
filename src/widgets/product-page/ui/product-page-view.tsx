"use client";

import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { useCartStore } from "@/features/cart";
import { Link } from "@/i18n/server";
import type { StorefrontProduct } from "@/lib/i18n-utils";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { buildProductImageAlt } from "@/shared/lib/product-image-alt";
import { AppButton } from "@/shared/ui/AppButton";
import { ProductCoverImage } from "@/shared/ui/product-cover-image";
import { tokens } from "@/shared/ui/theme";
import { ProductReviewsSection } from "@/widgets/reviews";

const ProductModifiersDialog = dynamic(
    () =>
        import("@/entities/product/ui/product-modifiers-dialog").then(
            (m) => m.ProductModifiersDialog,
        ),
    { ssr: false },
);

type BreadcrumbLink = {
    label: string;
    href: string;
};

type Props = {
    product: StorefrontProduct;
    locale: string;
    breadcrumbs: {
        home: BreadcrumbLink;
        menu: BreadcrumbLink;
        category?: BreadcrumbLink;
        current: string;
    };
};

export function ProductPageView({ product, locale, breadcrumbs }: Props) {
    const t = useTranslations("productPage");
    const tModifiers = useTranslations("product.modifiers");
    const addItem = useCartStore((s) => s.addItem);

    const [modifiersOpen, setModifiersOpen] = useState(false);

    const coverUrl = getProductCoverUrl(product);
    const imageAlt = buildProductImageAlt(product.name, locale);
    const hasModifiers = (product.modifierGroups?.length ?? 0) > 0;

    const descriptionText = useMemo(() => {
        const parts = [product.description, product.composition]
            .map((part) => part?.trim())
            .filter(Boolean) as string[];
        return parts.join("\n\n");
    }, [product.composition, product.description]);

    const handleAddToCart = useCallback(() => {
        if (hasModifiers) {
            setModifiersOpen(true);
            return;
        }

        addItem({
            productId: product.id,
            name: product.name,
            basePrice: product.price,
            selectedModifiers: [],
            calculatedItemPrice: product.price,
            image: coverUrl ?? undefined,
        });
    }, [addItem, coverUrl, hasModifiers, product]);

    return (
        <>
            <Box
                sx={{
                    maxWidth: 560,
                    mx: "auto",
                    pb: {
                        xs: "calc(96px + env(safe-area-inset-bottom) + 72px)",
                        sm: "calc(88px + env(safe-area-inset-bottom))",
                    },
                }}
            >
                <Breadcrumbs
                    aria-label={t("breadcrumbsLabel")}
                    sx={{
                        mb: 2,
                        "& .MuiBreadcrumbs-li": { maxWidth: "100%" },
                        "& .MuiBreadcrumbs-separator": {
                            mx: 0.5,
                            color: "text.disabled",
                        },
                    }}
                >
                    <Typography
                        component={Link}
                        href={breadcrumbs.home.href}
                        variant="body2"
                        sx={{
                            color: "text.secondary",
                            textDecoration: "none",
                            fontWeight: 500,
                            "&:hover": { color: "primary.main" },
                        }}
                    >
                        {breadcrumbs.home.label}
                    </Typography>
                    <Typography
                        component={Link}
                        href={breadcrumbs.menu.href}
                        variant="body2"
                        sx={{
                            color: "text.secondary",
                            textDecoration: "none",
                            fontWeight: 500,
                            "&:hover": { color: "primary.main" },
                        }}
                    >
                        {breadcrumbs.menu.label}
                    </Typography>
                    {breadcrumbs.category ? (
                        <Typography
                            component={Link}
                            href={breadcrumbs.category.href}
                            variant="body2"
                            sx={{
                                color: "text.secondary",
                                textDecoration: "none",
                                fontWeight: 500,
                                maxWidth: 120,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "inline-block",
                                verticalAlign: "bottom",
                                "&:hover": { color: "primary.main" },
                            }}
                        >
                            {breadcrumbs.category.label}
                        </Typography>
                    ) : null}
                    <Typography
                        variant="body2"
                        color="text.primary"
                        fontWeight={600}
                        sx={{
                            maxWidth: { xs: 140, sm: 220 },
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "inline-block",
                            verticalAlign: "bottom",
                        }}
                    >
                        {breadcrumbs.current}
                    </Typography>
                </Breadcrumbs>

                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        borderRadius: `${tokens.radiusCardLg}px`,
                        overflow: "hidden",
                        bgcolor: tokens.surfaceHi,
                        mb: 2.5,
                    }}
                >
                    <ProductCoverImage
                        src={coverUrl}
                        alt={imageAlt}
                        priority
                        sizes="(max-width: 600px) 100vw, 560px"
                    />
                </Box>

                {product.category?.name ? (
                    <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ letterSpacing: "0.08em", display: "block", mb: 0.75 }}
                    >
                        {product.category.name}
                    </Typography>
                ) : null}

                <Typography
                    component="h1"
                    variant="h4"
                    fontWeight={800}
                    sx={{
                        lineHeight: 1.15,
                        letterSpacing: -0.4,
                        fontSize: { xs: "1.65rem", sm: "2rem" },
                        mb: 1,
                    }}
                >
                    {product.name}
                </Typography>

                {product.ratingCount > 0 && (
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        component="a"
                        href="#reviews"
                        sx={{ mb: 1, textDecoration: "none", width: "fit-content" }}
                    >
                        <StarIcon sx={{ fontSize: 18, color: "#FFB800" }} />
                        <Typography variant="body2" fontWeight={700}>
                            {product.ratingAvg}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: tokens.textMuted,
                                "&:hover": { color: tokens.brand },
                            }}
                        >
                            · {t("reviewsCount", { count: product.ratingCount })}
                        </Typography>
                    </Stack>
                )}

                <Stack
                    direction="row"
                    alignItems="baseline"
                    spacing={1.5}
                    sx={{ mb: 2.5, flexWrap: "wrap" }}
                >
                    <Typography
                        component="p"
                        variant="h5"
                        fontWeight={800}
                        sx={{
                            color: tokens.brand,
                            fontVariantNumeric: "tabular-nums",
                            fontSize: { xs: "1.35rem", sm: "1.5rem" },
                            m: 0,
                        }}
                    >
                        {hasModifiers
                            ? tModifiers("fromPrice", {
                                  price: formatStorePrice(product.price),
                              })
                            : `${formatStorePrice(product.price)} ֏`}
                    </Typography>
                    {product.weight ? (
                        <Typography variant="body2" color="text.secondary">
                            {t("weight", { weight: product.weight })}
                        </Typography>
                    ) : null}
                </Stack>

                {product.description?.trim() ? (
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                            lineHeight: 1.65,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            mb: product.composition?.trim() ? 2 : 0,
                        }}
                    >
                        {product.description.trim()}
                    </Typography>
                ) : null}

                {product.composition?.trim() ? (
                    <Box sx={{ mt: product.description?.trim() ? 0 : 0 }}>
                        <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            sx={{ mb: 0.75 }}
                        >
                            {t("composition")}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                lineHeight: 1.65,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {product.composition.trim()}
                        </Typography>
                    </Box>
                ) : null}

                <Box id="reviews" sx={{ scrollMarginTop: 96 }}>
                    <ProductReviewsSection productId={product.id} />
                </Box>
            </Box>

            <Box
                sx={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: {
                        xs: "calc(72px + env(safe-area-inset-bottom))",
                        sm: 0,
                    },
                    zIndex: 1100,
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    pb: {
                        xs: "calc(12px + env(safe-area-inset-bottom))",
                        sm: "calc(16px + env(safe-area-inset-bottom))",
                    },
                    bgcolor: "background.paper",
                    borderTop: "1px solid",
                    borderColor: "divider",
                    boxShadow: (theme) =>
                        `0 -8px 24px ${alpha(theme.palette.common.black, 0.08)}`,
                }}
            >
                <Box sx={{ maxWidth: 560, mx: "auto" }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ textTransform: "uppercase", lineHeight: 1.2 }}
                            >
                                {tModifiers("total")}
                            </Typography>
                            <Typography
                                variant="h6"
                                fontWeight={800}
                                sx={{
                                    color: "primary.main",
                                    fontVariantNumeric: "tabular-nums",
                                    lineHeight: 1.1,
                                }}
                            >
                                {hasModifiers
                                    ? tModifiers("fromPrice", {
                                          price: formatStorePrice(product.price),
                                      })
                                    : `${formatStorePrice(product.price)} ֏`}
                            </Typography>
                        </Box>
                        <AppButton
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleAddToCart}
                            sx={{
                                flexShrink: 0,
                                minWidth: { xs: 148, sm: 180 },
                                minHeight: 48,
                                px: 3,
                                borderRadius: 2.5,
                                textTransform: "none",
                                fontWeight: 800,
                            }}
                        >
                            {t("addToCart")}
                        </AppButton>
                    </Stack>
                </Box>
            </Box>

            <ProductModifiersDialog
                open={modifiersOpen}
                onClose={() => setModifiersOpen(false)}
                productName={product.name}
                description={descriptionText || undefined}
                basePrice={product.price}
                modifierGroups={product.modifierGroups ?? []}
                onConfirm={({ selectedModifiers, calculatedItemPrice }) => {
                    addItem({
                        productId: product.id,
                        name: product.name,
                        basePrice: product.price,
                        selectedModifiers,
                        calculatedItemPrice,
                        image: coverUrl ?? undefined,
                    });
                    setModifiersOpen(false);
                }}
            />
        </>
    );
}

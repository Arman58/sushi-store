"use client";

import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";

import type { ConnectableProduct } from "@/entities/product/ui/connected-product-card";
import { Link } from "@/i18n/server";
import { formatStorePrice } from "@/shared/lib/format-price";
import { getProductCoverUrl } from "@/shared/lib/product-cover";
import { buildProductImageAlt } from "@/shared/lib/product-image-alt";
import { ProductCoverImage } from "@/shared/ui/product-cover-image";
import { tokens } from "@/shared/ui/theme";

type Props = {
    open: boolean;
    onClose: () => void;
    product: ConnectableProduct;
    /** Добавление (сам открывает модификаторы, если они есть). */
    onAdd: () => void;
};

/**
 * Mobile bottom-sheet товара (паттерн Wolt): детали и покупка без
 * перехода со списка. Полная страница - по ссылке «Подробнее и отзывы».
 */
export function ProductQuickView({ open, onClose, product, onAdd }: Props) {
    const tCommon = useTranslations("common");
    const tPage = useTranslations("productPage");
    const locale = useLocale();

    const coverUrl = getProductCoverUrl(product);
    const hasModifiers = (product.modifierGroups?.length ?? 0) > 0;
    const isAvailable = product.isAvailable !== false;
    const previewText =
        product.description?.trim() || product.composition?.trim() || "";

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        borderLeft: "none",
                        maxHeight: "88dvh",
                        pb: "env(safe-area-inset-bottom)",
                    },
                },
            }}
        >
            {/* Grabber + close */}
            <Box
                sx={{
                    position: "relative",
                    pt: 1,
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 4,
                        borderRadius: 999,
                        bgcolor: tokens.borderHi,
                    }}
                />
                <IconButton
                    onClick={onClose}
                    aria-label={tCommon("aria.close")}
                    sx={{
                        position: "absolute",
                        top: 6,
                        right: 8,
                        bgcolor: "rgba(255,255,255,0.9)",
                        zIndex: 1,
                    }}
                >
                    <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>

            <Box sx={{ overflowY: "auto", px: 2, pt: 1.5 }}>
                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "16 / 10",
                        borderRadius: `${tokens.radiusCardLg}px`,
                        overflow: "hidden",
                        bgcolor: tokens.surfaceHi,
                        mb: 1.75,
                    }}
                >
                    <ProductCoverImage
                        src={coverUrl}
                        alt={buildProductImageAlt(product.name, locale)}
                        sizes="100vw"
                    />
                </Box>

                <Typography
                    component="h2"
                    sx={{
                        fontWeight: 800,
                        fontSize: "1.25rem",
                        letterSpacing: -0.4,
                        lineHeight: 1.2,
                    }}
                >
                    {product.name}
                </Typography>

                {(product.ratingCount ?? 0) > 0 && (
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ mt: 0.5 }}
                    >
                        <StarIcon sx={{ fontSize: 16, color: "#FFB800" }} />
                        <Typography variant="body2" fontWeight={700}>
                            {product.ratingAvg}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: tokens.textMuted }}
                        >
                            ({product.ratingCount})
                        </Typography>
                    </Stack>
                )}

                {previewText && (
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 1,
                            color: tokens.textSecondary,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {previewText}
                    </Typography>
                )}

                <Button
                    component={Link}
                    href={`/menu/${product.slug}`}
                    onClick={onClose}
                    size="small"
                    sx={{
                        mt: 1,
                        mb: 1.5,
                        px: 0.5,
                        fontWeight: 700,
                        color: tokens.brand,
                    }}
                >
                    {tPage("quickView.fullPage")} →
                </Button>
            </Box>

            {/* Sticky CTA */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: `1px solid ${tokens.border}`,
                    bgcolor: "background.paper",
                }}
            >
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={!isAvailable}
                    onClick={() => {
                        onAdd();
                        if (!hasModifiers) onClose();
                    }}
                    sx={{
                        fontWeight: 800,
                        borderRadius: "12px",
                        minHeight: 50,
                    }}
                >
                    {!isAvailable
                        ? tPage("soldOut")
                        : hasModifiers
                          ? tPage("quickView.choose")
                          : `${tPage("addToCart")} · ${formatStorePrice(product.price)} ֏`}
                </Button>
            </Box>
        </Drawer>
    );
}

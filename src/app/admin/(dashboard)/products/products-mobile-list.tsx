"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import {
    Avatar,
    Box,
    Button,
    IconButton,
    Paper,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";

import { getLocalizedField } from "@/lib/i18n-utils";
import { getProductCoverUrl, getProductImageUrls } from "@/shared/lib/product-cover";

import type { ProductRow, ProductRowActions } from "./product-row-types";
import { ShelfToggle } from "./shelf-toggle";

export function ProductsMobileList(props: {
    products: ProductRow[];
    actions: ProductRowActions;
}) {
    const { products, actions } = props;
    const t = useTranslations("admin.products");
    const tCommon = useTranslations("admin.common");

    return (
        <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
            {products.map((product) => {
                const imageUrl = getProductCoverUrl(product);
                const showImage = Boolean(imageUrl);
                const canCycleMain =
                    getProductImageUrls(product.images).length >= 2;
                const busy = actions.deletingId === product.id;

                return (
                    <Paper
                        key={product.id}
                        elevation={0}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 1.5,
                            mb: 1.5,
                            borderRadius: 3,
                            transition: "all 0.3s ease",
                            opacity: product.isActive ? 1 : 0.6,
                            filter: product.isActive ? "none" : "grayscale(80%)",
                        }}
                    >
                        {showImage ? (
                            <Avatar
                                src={imageUrl ?? undefined}
                                variant="rounded"
                                sx={{ width: 56, height: 56 }}
                                alt={getLocalizedField(product.name, "hy")}
                            />
                        ) : (
                            <Avatar
                                variant="rounded"
                                sx={{
                                    width: 56,
                                    height: 56,
                                    bgcolor: "action.hover",
                                    color: "text.secondary",
                                }}
                            >
                                <ImageIcon />
                            </Avatar>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography noWrap sx={{ fontWeight: 600 }}>
                                {getLocalizedField(product.name, "hy")}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                }}
                                noWrap
                            >
                                {product.category
                                    ? getLocalizedField(product.category.name, "hy")
                                    : "-"}
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                            <Typography sx={{ fontWeight: 700 }}>
                                {product.price.toLocaleString("ru-RU")} ֏
                            </Typography>
                            <Box sx={{ mt: -0.5 }}>
                                <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        fontSize: "0.65rem",
                                        lineHeight: 1,
                                        display: "block",
                                        textAlign: "right",
                                    }}
                                >
                                    {tCommon("onShelf")}
                                </Typography>
                                <ShelfToggle
                                    product={product}
                                    disabled={busy || actions.saveLoading}
                                    onChange={(next) =>
                                        actions.onShelfChange(product.id, next)
                                    }
                                />
                            </Box>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    gap: 0.5,
                                    mt: 0.25,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 0,
                                    }}
                                >
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => actions.onEdit(product)}
                                        disabled={busy || actions.saveLoading}
                                        aria-label={tCommon("edit")}
                                    >
                                        <EditIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        disabled={busy}
                                        onClick={() => actions.onDeleteNow(product.id)}
                                        aria-label={tCommon("delete")}
                                    >
                                        <DeleteIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Box>
                                {canCycleMain ? (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() =>
                                            actions.onCycleMainCover(product)
                                        }
                                        disabled={
                                            busy ||
                                            actions.saveLoading ||
                                            actions.rotatingMainId === product.id
                                        }
                                        sx={{
                                            fontSize: "0.7rem",
                                            px: 1,
                                            py: 0.25,
                                            minWidth: 0,
                                        }}
                                    >
                                        {t("makeCoverMain")}
                                    </Button>
                                ) : null}
                            </Box>
                        </Box>
                    </Paper>
                );
            })}
        </Box>
    );
}

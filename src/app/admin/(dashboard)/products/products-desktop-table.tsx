"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    Box,
    Button,
    IconButton,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
    Typography,
} from "@mui/material";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { useLocalizedFieldFn } from "@/features/admin/hooks/use-admin-content-locale";
import { LocalizedStatusChips } from "@/features/admin/ui/localized-status-chips";
import { getProductCoverUrl, getProductImageUrls } from "@/shared/lib/product-cover";

import type { ProductRow, ProductRowActions } from "./product-row-types";
import type { ProductSortBy, ProductTableView } from "./products-table-controls";
import { ShelfToggle } from "./shelf-toggle";

const MAX_COMP_LEN = 80;

function trimComposition(text: string | null): string {
    if (!text) return "-";
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length <= MAX_COMP_LEN) return t;
    return `${t.slice(0, MAX_COMP_LEN).trimEnd()}…`;
}

export function ProductsDesktopTable(props: {
    products: ProductRow[];
    view: ProductTableView;
    onSort: (column: ProductSortBy) => void;
    actions: ProductRowActions;
}) {
    const { products, view, onSort, actions } = props;
    const t = useTranslations("admin.products");
    const tCommon = useTranslations("admin.common");
    const lf = useLocalizedFieldFn();

    const sortCell = (column: ProductSortBy, label: string, align?: "right") => (
        <TableCell
            key={column}
            align={align}
            sortDirection={view.sortBy === column ? view.sortDir : false}
        >
            <TableSortLabel
                active={view.sortBy === column}
                direction={view.sortBy === column ? view.sortDir : "asc"}
                onClick={() => onSort(column)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    );

    return (
        <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        {sortCell("id", tCommon("id"))}
                        <TableCell>{tCommon("image")}</TableCell>
                        {sortCell("name", tCommon("name"))}
                        <TableCell>{tCommon("composition")}</TableCell>
                        {sortCell("category", tCommon("category"))}
                        {sortCell("price", tCommon("price"), "right")}
                        {sortCell("createdAt", tCommon("created"), "right")}
                        {sortCell("isActive", tCommon("onShelf"), "right")}
                        <TableCell align="right" width={100} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {products.map((product) => {
                        const thumb = getProductCoverUrl(product);
                        const canCycleMain =
                            getProductImageUrls(product.images).length >= 2;
                        const busy = actions.deletingId === product.id;
                        return (
                            <TableRow
                                key={product.id}
                                hover
                                sx={{
                                    transition: "all 0.3s ease",
                                    opacity: product.isActive ? 1 : 0.6,
                                    filter: product.isActive
                                        ? "none"
                                        : "grayscale(80%)",
                                }}
                            >
                                <TableCell>{product.id}</TableCell>
                                <TableCell>
                                    <Box
                                        sx={{
                                            position: "relative",
                                            width: 50,
                                            height: 50,
                                            bgcolor: "action.hover",
                                        }}
                                    >
                                        {thumb ? (
                                            <Image
                                                src={thumb}
                                                alt={lf(product.name)}
                                                width={50}
                                                height={50}
                                                style={{ objectFit: "cover" }}
                                                unoptimized
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: 50,
                                                    height: 50,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    typography: "caption",
                                                    color: "text.disabled",
                                                }}
                                            >
                                                -
                                            </Box>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.75,
                                        }}
                                    >
                                        <span>{lf(product.name)}</span>
                                        <LocalizedStatusChips value={product.name} />
                                    </Box>
                                </TableCell>
                                <TableCell
                                    sx={{
                                        maxWidth: 280,
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {trimComposition(lf(product.composition) || null)}
                                </TableCell>
                                <TableCell>
                                    {product.category ? lf(product.category.name) : "-"}
                                </TableCell>
                                <TableCell align="right">
                                    {product.price.toLocaleString("ru-RU")} ֏
                                </TableCell>
                                <TableCell align="right">
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ whiteSpace: "nowrap" }}
                                    >
                                        {product.createdAt
                                            ? new Date(
                                                  product.createdAt,
                                              ).toLocaleDateString("ru-RU")
                                            : "-"}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <ShelfToggle
                                        product={product}
                                        disabled={busy || actions.saveLoading}
                                        onChange={(next) =>
                                            actions.onShelfChange(product.id, next)
                                        }
                                    />
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            justifyContent: "flex-end",
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            color={
                                                product.isAvailable === false
                                                    ? "error"
                                                    : "text.secondary"
                                            }
                                            sx={{ fontSize: "0.65rem" }}
                                        >
                                            {product.isAvailable === false
                                                ? tCommon("stopList")
                                                : tCommon("inStock")}
                                        </Typography>
                                        <Switch
                                            size="small"
                                            checked={product.isAvailable !== false}
                                            disabled={busy}
                                            onChange={(e) =>
                                                actions.onStockChange(
                                                    product.id,
                                                    e.target.checked,
                                                )
                                            }
                                            inputProps={{ "aria-label": tCommon("inStock") }}
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-end",
                                            gap: 0.75,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "flex-end",
                                            }}
                                        >
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => actions.onEdit(product)}
                                                disabled={busy || actions.saveLoading}
                                                aria-label={tCommon("edit")}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                disabled={busy}
                                                onClick={() =>
                                                    actions.onRequestDelete(product.id)
                                                }
                                                aria-label={tCommon("delete")}
                                            >
                                                <DeleteIcon fontSize="small" />
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
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {t("makeCoverMain")}
                                            </Button>
                                        ) : null}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Box>
    );
}

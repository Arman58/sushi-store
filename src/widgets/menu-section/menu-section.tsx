// src/widgets/menu-section/menu-section.tsx
"use client";

import CloseIcon from "@mui/icons-material/Close";
import RestaurantMenuOutlined from "@mui/icons-material/RestaurantMenuOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";

import { ProductCard } from "@/entities/product/ui/product-card";
import { useCartStore } from "@/features/cart";
import { tokens } from "@/shared/ui/theme";

export type MenuCategory = {
    id: number;
    name: string;
    slug: string;
};

export type MenuProduct = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    composition?: string | null;
    price: number;
    weight?: number | null;
    images?: any;
    category?: MenuCategory | null;
};

type MenuSectionProps = {
    categories: MenuCategory[];
    products: MenuProduct[];
};

// ─── Keyframe (cart bar slide-up) ────────────────────────────────────────────

const CART_BAR_KF = `
@keyframes cartBarSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
`;

function ensureCartBarKf() {
    if (typeof document === "undefined") return;
    if (document.getElementById("cart-bar-kf")) return;
    const s = document.createElement("style");
    s.id = "cart-bar-kf";
    s.textContent = CART_BAR_KF;
    document.head.appendChild(s);
}

// ─── Price filter config ──────────────────────────────────────────────────────

const PRICE_FILTERS = [
    { key: "all", label: "Все цены" },
    { key: "lt3", label: "< 3 000 ֏" },
    { key: "lt5", label: "< 5 000 ֏" },
    { key: "gt5", label: "> 5 000 ֏" },
] as const;

type PriceFilter = (typeof PRICE_FILTERS)[number]["key"];

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuSection({ categories, products }: MenuSectionProps) {
    const searchParams = useSearchParams();

    const addItem = useCartStore((s) => s.addItem);
    const setItemQuantity = useCartStore((s) => s.setItemQuantity);
    const cartItems = useCartStore((s) => s.items);
    const hasPriceMismatch = useCartStore((s) => s.hasPriceMismatch);
    const resetPriceMismatch = useCartStore((s) => s.resetPriceMismatch);
    const clearCart = useCartStore((s) => s.clear);

    const [barVisible, setBarVisible] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        return sessionStorage.getItem("menuCartBarHidden") !== "1";
    });
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"name" | "price_asc" | "price_desc">(
        "name",
    );
    const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

    useEffect(() => {
        ensureCartBarKf();
    }, []);

    // Re-show bar when cart empties
    useEffect(() => {
        if (cartItems.length === 0 && !barVisible) {
            sessionStorage.removeItem("menuCartBarHidden");
            setBarVisible(true);
        }
    }, [cartItems.length, barVisible]);

    const allSlugs = useMemo(
        () => ["all", ...categories.map((c) => c.slug)],
        [categories],
    );
    const categoryFromUrl = searchParams.get("category") ?? undefined;
    const activeSlug =
        categoryFromUrl && allSlugs.includes(categoryFromUrl)
            ? categoryFromUrl
            : "all";

    const filteredProducts = useMemo(() => {
        const base =
            activeSlug === "all"
                ? products
                : products.filter((p) => p.category?.slug === activeSlug);

        const byPrice = base.filter((p) => {
            if (priceFilter === "lt3") return p.price < 3000;
            if (priceFilter === "lt5") return p.price < 5000;
            if (priceFilter === "gt5") return p.price >= 5000;
            return true;
        });

        const query = search.trim().toLowerCase();
        const withSearch =
            query.length === 0
                ? byPrice
                : byPrice.filter(
                      (p) =>
                          p.name.toLowerCase().includes(query) ||
                          (p.description ?? "").toLowerCase().includes(query),
                  );

        return [...withSearch].sort((a, b) => {
            if (sort === "price_asc") return a.price - b.price;
            if (sort === "price_desc") return b.price - a.price;
            return a.name.localeCompare(b.name, "ru");
        });
    }, [activeSlug, priceFilter, products, search, sort]);

    const productsInActiveCategory = useMemo(() => {
        if (activeSlug === "all") return products;
        return products.filter((p) => p.category?.slug === activeSlug);
    }, [activeSlug, products]);

    /** Категория выбрана, но в ней ещё нет ни одного товара (не «ничего не нашлось» по поиску). */
    const isEmptyCategoryShelf =
        activeSlug !== "all" && productsInActiveCategory.length === 0;

    const { totalCount, totalPrice } = useMemo(
        () => ({
            totalCount: cartItems.reduce((s, i) => s + i.quantity, 0),
            totalPrice: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
        }),
        [cartItems],
    );

    const handleAddToCart = (p: MenuProduct) => {
        addItem({ productId: p.id, name: p.name, price: p.price });
    };
    const handleIncrease = (productId: number) => {
        const qty =
            (cartItems.find((i) => i.productId === productId)?.quantity ?? 0) +
            1;
        setItemQuantity(productId, qty);
    };
    const handleDecrease = (productId: number) => {
        const qty =
            (cartItems.find((i) => i.productId === productId)?.quantity ?? 0) -
            1;
        setItemQuantity(productId, qty);
    };

    return (
        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* ══════════════════════════════════════════════════════
                STICKY FILTER HEADER
                Dark frosted glass — always above content on scroll
            ══════════════════════════════════════════════════════ */}
            <Box
                sx={{
                    position: "sticky",
                    mb: 2,
                    top: {
                        xs: "calc(56px + env(safe-area-inset-top))",
                        sm: 64,
                    },
                    zIndex: 9,
                    bgcolor: `${tokens.bg}EE`,
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    borderBottom: `1px solid ${tokens.border}`,
                    mx: { xs: -2, sm: -3, md: 0 },
                    px: { xs: 2, sm: 3, md: 0 },
                    pb: 1.5,
                    pt: 0.75,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.25,
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 2,
                        mx: 2,
                        borderRadius: 4,
                        bgcolor: "background.paper",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    }}
                >
                    <TextField
                        fullWidth
                        variant="outlined"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                        placeholder="Поиск по меню..."
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon
                                        sx={{
                                            fontSize: 18,
                                            color: tokens.textMuted,
                                        }}
                                    />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            maxWidth: { sm: 420 },
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 50,
                                bgcolor: "#f5f5f5",
                                "& fieldset": { border: "none" },
                                "&:hover fieldset": { border: "none" },
                                "&.Mui-focused": {
                                    bgcolor: "#fff",
                                },
                                "&.Mui-focused fieldset": {
                                    border: "none",
                                    bgcolor: "#fff",
                                    boxShadow:
                                        "0 0 0 2px rgba(232, 93, 74, 0.2)",
                                },
                            },
                        }}
                    />

                    <Box
                        sx={{
                            mt: 2,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 1,
                            alignItems: "center",
                        }}
                    >
                        <ToggleButtonGroup
                            value={sort}
                            exclusive
                            size="small"
                            onChange={(_, v) => {
                                if (v) setSort(v);
                            }}
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.75,
                                "& .MuiToggleButtonGroup-grouped": {
                                    borderRadius: 3,
                                    m: 0,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    textTransform: "none",
                                    px: 2,
                                    py: 1,
                                    border: "1px solid #e0e0e0 !important",
                                    bgcolor: "transparent",
                                    "&:not(.Mui-selected)": {
                                        color: "text.secondary",
                                    },
                                    "&.Mui-selected": {
                                        bgcolor: "primary.main",
                                        color: "#fff",
                                        border: "none !important",
                                        boxShadow: 2,
                                        fontWeight: 600,
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="name" color="primary">
                                По алфавиту
                            </ToggleButton>
                            <ToggleButton value="price_asc" color="primary">
                                Цена ↑
                            </ToggleButton>
                            <ToggleButton value="price_desc" color="primary">
                                Цена ↓
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <Stack
                            direction="row"
                            flexWrap="wrap"
                            sx={{ gap: 0.75, alignItems: "center" }}
                        >
                            {PRICE_FILTERS.map(({ key, label }) => {
                                const active = priceFilter === key;
                                return (
                                    <Button
                                        key={key}
                                        onClick={() => setPriceFilter(key)}
                                        size="small"
                                        disableElevation
                                        variant={
                                            active ? "contained" : "outlined"
                                        }
                                        color={active ? "primary" : "inherit"}
                                        sx={{
                                            borderRadius: 3,
                                            textTransform: "none",
                                            fontSize: 12,
                                            fontWeight: active ? 600 : 500,
                                            px: 2,
                                            py: 1,
                                            minWidth: 0,
                                            border: active
                                                ? "none"
                                                : "1px solid #e0e0e0",
                                            bgcolor: active
                                                ? "primary.main"
                                                : "transparent",
                                            color: active
                                                ? "#fff"
                                                : "text.secondary",
                                            boxShadow: active ? 2 : "none",
                                            "&:hover": {
                                                bgcolor: active
                                                    ? "primary.dark"
                                                    : "action.hover",
                                                borderColor: active
                                                    ? undefined
                                                    : "#e0e0e0",
                                            },
                                        }}
                                    >
                                        {label}
                                    </Button>
                                );
                            })}

                            {(search ||
                                priceFilter !== "all" ||
                                sort !== "name") && (
                                <Button
                                    onClick={() => {
                                        setSearch("");
                                        setSort("name");
                                        setPriceFilter("all");
                                    }}
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    disableElevation
                                    sx={{
                                        borderRadius: 3,
                                        textTransform: "none",
                                        fontSize: 12,
                                        px: 2,
                                        py: 1,
                                        border: "1px solid #e0e0e0",
                                        bgcolor: "transparent",
                                        color: "text.secondary",
                                    }}
                                >
                                    Сбросить ✕
                                </Button>
                            )}
                        </Stack>
                    </Box>
                </Paper>
            </Box>

            {/* ══════════════════════════════════════════════════════
                PRODUCT GRID
            ══════════════════════════════════════════════════════ */}
            {filteredProducts.length === 0 ? (
                isEmptyCategoryShelf ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            py: 10,
                            textAlign: "center",
                        }}
                    >
                        <RestaurantMenuOutlined
                            sx={{ fontSize: 80, color: "grey.300", mb: 2 }}
                        />
                        <Typography
                            variant="h6"
                            color="text.secondary"
                            fontWeight={600}
                        >
                            Здесь пока пусто
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{ mt: 1, maxWidth: 250 }}
                        >
                            Мы уже готовим блюда для этой категории. Скоро они
                            появятся!
                        </Typography>
                        <Button
                            component={Link}
                            href="/menu"
                            variant="outlined"
                            color="primary"
                            sx={{ mt: 3, borderRadius: 3 }}
                        >
                            Посмотреть другие блюда
                        </Button>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            py: 12,
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1.5,
                        }}
                    >
                        <Typography sx={{ fontSize: 52, lineHeight: 1 }}>
                            🍽
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                            Ничего не нашлось
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: tokens.textSecondary }}
                        >
                            Попробуйте другой запрос или сбросьте фильтры
                        </Typography>
                    </Box>
                )
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gap: { xs: 1.5, sm: 2, md: 2.5 },
                        pt: 2,
                        pb: "100px",
                        gridTemplateColumns:
                            "repeat(auto-fill, minmax(160px, 1fr))",
                    }}
                >
                    {filteredProducts.map((product, index) => {
                        const qty =
                            cartItems.find((i) => i.productId === product.id)
                                ?.quantity ?? 0;
                        return (
                            <ProductCard
                                key={product.id}
                                index={index}
                                name={product.name}
                                composition={
                                    product.composition ||
                                    product.description ||
                                    ""
                                }
                                price={product.price}
                                weight={product.weight ?? undefined}
                                images={product.images}
                                onAddToCart={() => handleAddToCart(product)}
                                quantity={qty}
                                onIncrease={() => handleIncrease(product.id)}
                                onDecrease={() => handleDecrease(product.id)}
                            />
                        );
                    })}
                </Box>
            )}

            {/* ══════════════════════════════════════════════════════
                FLOATING CART BAR — Paper CTA strip (compact checkout focus)
            ══════════════════════════════════════════════════════ */}
            {totalCount > 0 && barVisible && (
                <Box
                    sx={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: {
                            xs: "calc(72px + env(safe-area-inset-bottom, 0px))",
                            sm: 24,
                        },
                        display: "flex",
                        justifyContent: "center",
                        zIndex: 50,
                        px: { xs: 0, sm: 2 },
                        pointerEvents: "none",
                    }}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            pointerEvents: "auto",
                            borderRadius: "20px 20px 0 0",
                            p: 2,
                            border: "none",
                            pb: "calc(8px + env(safe-area-inset-bottom, 0px))",
                            width: { xs: "100%", sm: "auto" },
                            maxWidth: { xs: "100%", sm: 580 },
                            animation:
                                "cartBarSlideUp 0.22s cubic-bezier(.22,.68,0,1.2) both",
                        }}
                    >
                        <Stack spacing={1.5}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 1.25,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: "14px",
                                        bgcolor: "action.hover",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <ShoppingBagOutlinedIcon
                                        sx={{
                                            fontSize: 20,
                                            color: "primary.main",
                                        }}
                                    />
                                </Box>

                                <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "baseline",
                                            gap: 1,
                                        }}
                                    >
                                        <Typography
                                            component={Link}
                                            href="/cart"
                                            fontWeight={800}
                                            sx={{
                                                fontSize: 16,
                                                color: "text.primary",
                                                textDecoration: "none",
                                                "&:hover": {
                                                    textDecoration: "underline",
                                                },
                                            }}
                                        >
                                            Корзина
                                        </Typography>
                                        <Typography
                                            fontWeight={800}
                                            noWrap
                                            sx={{
                                                fontSize: 17,
                                                color: "primary.main",
                                            }}
                                        >
                                            <CountUp
                                                end={totalPrice}
                                                duration={0.5}
                                                separator=" "
                                                decimals={0}
                                            />
                                            &thinsp;֏
                                        </Typography>
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: "block",
                                            mt: 0.25,
                                            color: "text.secondary",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {totalCount}&thinsp;
                                        {totalCount === 1
                                            ? "позиция"
                                            : totalCount < 5
                                              ? "позиции"
                                              : "позиций"}
                                    </Typography>
                                </Box>

                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        sessionStorage.setItem(
                                            "menuCartBarHidden",
                                            "1",
                                        );
                                        setBarVisible(false);
                                    }}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        mt: -0.25,
                                        color: "text.secondary",
                                        flexShrink: 0,
                                        "&:hover": {
                                            color: "error.main",
                                            bgcolor: "action.hover",
                                        },
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>

                            {hasPriceMismatch && (
                                <Button
                                    fullWidth
                                    size="small"
                                    onClick={() => {
                                        clearCart();
                                        resetPriceMismatch();
                                    }}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: "none",
                                        py: 0.75,
                                        fontWeight: 600,
                                        border: "1px solid",
                                        borderColor: "divider",
                                    }}
                                >
                                    Обновить корзину
                                </Button>
                            )}

                            <Button
                                component={Link}
                                href="/checkout"
                                variant="contained"
                                disableElevation
                                fullWidth
                                sx={{
                                    borderRadius: 50,
                                    flex: 1,
                                    minHeight: 50,
                                    height: 50,
                                    py: 0,
                                    boxShadow: 4,
                                    textTransform: "none",
                                    fontSize: 15,
                                    fontWeight: 800,
                                    color: "#fff",
                                    bgcolor: "primary.main",
                                    "&:hover": {
                                        bgcolor: "primary.dark",
                                        boxShadow: 6,
                                    },
                                }}
                            >
                                Оформить&nbsp;→
                            </Button>
                        </Stack>
                    </Paper>
                </Box>
            )}
        </Box>
    );
}

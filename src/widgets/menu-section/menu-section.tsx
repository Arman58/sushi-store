// src/widgets/menu-section/menu-section.tsx
"use client";

import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
    price: number;
    weight?: number | null;
    image?: string | null;
    category?: MenuCategory | null;
};

type MenuSectionProps = {
    categories: MenuCategory[];
    products: MenuProduct[];
};

const fmt = new Intl.NumberFormat("ru-RU");

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
    const router       = useRouter();
    const searchParams = useSearchParams();

    const addItem            = useCartStore((s) => s.addItem);
    const setItemQuantity    = useCartStore((s) => s.setItemQuantity);
    const cartItems          = useCartStore((s) => s.items);
    const hasPriceMismatch   = useCartStore((s) => s.hasPriceMismatch);
    const resetPriceMismatch = useCartStore((s) => s.resetPriceMismatch);
    const clearCart          = useCartStore((s) => s.clear);

    const [barVisible,   setBarVisible]   = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        return sessionStorage.getItem("menuCartBarHidden") !== "1";
    });
    const [search,       setSearch]       = useState("");
    const [sort,         setSort]         = useState<"name" | "price_asc" | "price_desc">("name");
    const [priceFilter,  setPriceFilter]  = useState<PriceFilter>("all");

    useEffect(() => { ensureCartBarKf(); }, []);

    // Re-show bar when cart empties
    useEffect(() => {
        if (cartItems.length === 0 && !barVisible) {
            sessionStorage.removeItem("menuCartBarHidden");
            setBarVisible(true);
        }
    }, [cartItems.length, barVisible]);

    const allSlugs = useMemo(() => ["all", ...categories.map((c) => c.slug)], [categories]);
    const categoryFromUrl = searchParams.get("category") ?? undefined;
    const activeSlug =
        categoryFromUrl && allSlugs.includes(categoryFromUrl) ? categoryFromUrl : "all";
    const tabs = useMemo(() => [{ slug: "all", name: "Все" }, ...categories], [categories]);

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
            if (sort === "price_asc")  return a.price - b.price;
            if (sort === "price_desc") return b.price - a.price;
            return a.name.localeCompare(b.name, "ru");
        });
    }, [activeSlug, priceFilter, products, search, sort]);

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
        const qty = (cartItems.find((i) => i.productId === productId)?.quantity ?? 0) + 1;
        setItemQuantity(productId, qty);
    };
    const handleDecrease = (productId: number) => {
        const qty = (cartItems.find((i) => i.productId === productId)?.quantity ?? 0) - 1;
        setItemQuantity(productId, qty);
    };
    const handleTabChange = (_: React.SyntheticEvent, value: string) => {
        router.replace(value === "all" ? "/menu" : `/menu?category=${value}`);
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
                    top: 56,
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
                {/* Category tabs */}
                <Tabs
                    value={activeSlug}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 44,
                        "& .MuiTabs-indicator": { display: "none" },
                        "& .MuiTabs-scrollButtons": {
                            color: tokens.textMuted,
                            "&.Mui-disabled": { opacity: 0.2 },
                        },
                    }}
                >
                    {tabs.map((cat) => {
                        const isActive = activeSlug === cat.slug;
                        return (
                            <Tab
                                key={cat.slug}
                                value={cat.slug}
                                label={cat.name}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: isActive ? 800 : 500,
                                    fontSize: 13,
                                    minHeight: 36,
                                    py: 0.75,
                                    px: 1.75,
                                    mx: 0.25,
                                    borderRadius: "12px",
                                    color: isActive ? tokens.orange : tokens.textSecondary,
                                    bgcolor: isActive ? tokens.orangeDim : "transparent",
                                    border: `1px solid ${isActive ? tokens.orange + "44" : "transparent"}`,
                                    transition: "all 0.18s ease",
                                    "&:hover": {
                                        bgcolor: isActive ? tokens.orangeDim : tokens.surfaceUp,
                                        color: isActive ? tokens.orange : tokens.textPrimary,
                                    },
                                    "&.Mui-selected": { color: tokens.orange },
                                }}
                            />
                        );
                    })}
                </Tabs>

                {/* Search + Sort + Price filter */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                    {/* Search input */}
                    <TextField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                        placeholder="Поиск по меню..."
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: tokens.textMuted }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flex: { xs: "1 1 100%", sm: "0 1 260px" }, minWidth: 180 }}
                    />

                    {/* Sort — fully dark-themed ToggleButtonGroup */}
                    <ToggleButtonGroup
                        value={sort}
                        exclusive
                        size="small"
                        onChange={(_, v) => { if (v) setSort(v); }}
                        sx={{
                            "& .MuiToggleButtonGroup-grouped": {
                                border: `1px solid ${tokens.border} !important`,
                                borderRadius: "10px !important",
                                mx: "2px",
                                px: 1.5,
                                py: 0.6,
                                color: tokens.textSecondary,
                                fontWeight: 600,
                                fontSize: 12,
                                textTransform: "none",
                                bgcolor: tokens.surfaceUp,
                                transition: "all 0.18s ease",
                                "&:hover": {
                                    bgcolor: tokens.surfaceHi,
                                    color: tokens.textPrimary,
                                    border: `1px solid ${tokens.borderHi} !important`,
                                },
                                "&.Mui-selected": {
                                    bgcolor: `${tokens.orangeDim} !important`,
                                    color: `${tokens.orange} !important`,
                                    border: `1px solid ${tokens.orange}44 !important`,
                                    fontWeight: 700,
                                },
                            },
                        }}
                    >
                        <ToggleButton value="name">По алфавиту</ToggleButton>
                        <ToggleButton value="price_asc">Цена ↑</ToggleButton>
                        <ToggleButton value="price_desc">Цена ↓</ToggleButton>
                    </ToggleButtonGroup>

                    {/* Price filter — native buttons (fully controlled, no MUI Chip color confusion) */}
                    <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75 }}>
                        {PRICE_FILTERS.map(({ key, label }) => {
                            const active = priceFilter === key;
                            return (
                                <Box
                                    key={key}
                                    component="button"
                                    onClick={() => setPriceFilter(key)}
                                    sx={{
                                        px: 1.4,
                                        py: "5px",
                                        borderRadius: "10px",
                                        border: `1px solid ${active ? tokens.orange + "55" : tokens.border}`,
                                        bgcolor: active ? tokens.orangeDim : tokens.surfaceUp,
                                        color: active ? tokens.orange : tokens.textSecondary,
                                        fontWeight: active ? 700 : 500,
                                        fontSize: 12,
                                        cursor: "pointer",
                                        transition: "all 0.18s ease",
                                        fontFamily: "inherit",
                                        lineHeight: 1.5,
                                        "&:hover": {
                                            bgcolor: active ? tokens.orangeDim : tokens.surfaceHi,
                                            color: active ? tokens.orange : tokens.textPrimary,
                                        },
                                    }}
                                >
                                    {label}
                                </Box>
                            );
                        })}

                        {(search || priceFilter !== "all" || sort !== "name") && (
                            <Box
                                component="button"
                                onClick={() => { setSearch(""); setSort("name"); setPriceFilter("all"); }}
                                sx={{
                                    px: 1.4,
                                    py: "5px",
                                    borderRadius: "10px",
                                    border: `1px solid ${tokens.border}`,
                                    bgcolor: "transparent",
                                    color: tokens.textMuted,
                                    fontWeight: 500,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    lineHeight: 1.5,
                                    transition: "all 0.18s ease",
                                    "&:hover": {
                                        color: tokens.red,
                                        borderColor: tokens.red + "55",
                                    },
                                }}
                            >
                                Сбросить ✕
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Box>

            {/* ══════════════════════════════════════════════════════
                PRODUCT GRID
            ══════════════════════════════════════════════════════ */}
            {filteredProducts.length === 0 ? (
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
                    <Typography sx={{ fontSize: 52, lineHeight: 1 }}>🍽</Typography>
                    <Typography variant="h6" fontWeight={700}>
                        Ничего не нашлось
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
                        Попробуйте другой запрос или сбросьте фильтры
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gap: { xs: 1.5, sm: 2, md: 2.5 },
                        mt: 1,
                        gridTemplateColumns: {
                            xs: "1fr 1fr",
                            sm: "repeat(3, minmax(0, 1fr))",
                            md: "repeat(4, minmax(0, 1fr))",
                        },
                    }}
                >
                    {filteredProducts.map((product) => {
                        const qty =
                            cartItems.find((i) => i.productId === product.id)?.quantity ?? 0;
                        return (
                            <ProductCard
                                key={product.id}
                                name={product.name}
                                description={product.description}
                                price={product.price}
                                weight={product.weight ?? undefined}
                                image={product.image ?? undefined}
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
                FLOATING CART BAR
                ─ DARK glassmorphism — design system compliant ─
                NEVER use white backgrounds here.
                Text tokens are white — white on white = broken.
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
                        px: { xs: 2, sm: 0 },
                        pointerEvents: "none",
                    }}
                >
                    <Box
                        sx={{
                            pointerEvents: "auto",
                            display: "flex",
                            alignItems: "center",
                            gap: { xs: 1.5, sm: 2 },
                            px: { xs: 1.75, sm: 2.25 },
                            py: { xs: 1.25, sm: 1.5 },
                            borderRadius: "20px",
                            // ─── DARK system colors ───
                            bgcolor: tokens.surfaceHi,
                            backdropFilter: "blur(28px)",
                            WebkitBackdropFilter: "blur(28px)",
                            border: `1px solid ${tokens.orange}55`,
                            boxShadow: [
                                "0 8px 40px rgba(0,0,0,0.75)",
                                `0 0 0 1px ${tokens.border}`,
                                `0 0 60px ${tokens.orangeGlow}`,
                            ].join(", "),
                            width: { xs: "100%", sm: "auto" },
                            maxWidth: { xs: "100%", sm: 580 },
                            animation: "cartBarSlideUp 0.22s cubic-bezier(.22,.68,0,1.2) both",
                        }}
                    >
                        {/* Orange icon badge */}
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: "14px",
                                bgcolor: tokens.orangeDim,
                                border: `1px solid ${tokens.orange}44`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <ShoppingBagOutlinedIcon sx={{ fontSize: 20, color: tokens.orange }} />
                        </Box>

                        {/* Text block */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="subtitle2"
                                fontWeight={800}
                                noWrap
                                sx={{
                                    // Explicit white — never inherit light bg
                                    color: tokens.textPrimary,
                                    lineHeight: 1.2,
                                    fontSize: 14,
                                }}
                            >
                                {totalCount}&thinsp;
                                {totalCount === 1
                                    ? "позиция"
                                    : totalCount < 5
                                      ? "позиции"
                                      : "позиций"}
                            </Typography>
                            <Typography
                                variant="caption"
                                noWrap
                                sx={{
                                    color: tokens.orange,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    lineHeight: 1.3,
                                    display: "block",
                                }}
                            >
                                {fmt.format(totalPrice)}&thinsp;֏
                            </Typography>
                        </Box>

                        {/* CTA buttons */}
                        <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
                            {hasPriceMismatch && (
                                <Button
                                    size="small"
                                    onClick={() => { clearCart(); resetPriceMismatch(); }}
                                    sx={{
                                        borderRadius: "12px",
                                        textTransform: "none",
                                        px: 1.5,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: tokens.textSecondary,
                                        border: `1px solid ${tokens.border}`,
                                        "&:hover": {
                                            color: tokens.orange,
                                            borderColor: tokens.orange + "55",
                                            bgcolor: tokens.orangeDim,
                                        },
                                    }}
                                >
                                    Обновить
                                </Button>
                            )}

                            <Button
                                component={Link}
                                href="/cart"
                                size="small"
                                sx={{
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    px: 1.75,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    // ─── Explicit dark-on-dark, not light ───
                                    color: tokens.textSecondary,
                                    bgcolor: tokens.surfaceUp,
                                    border: `1px solid ${tokens.border}`,
                                    "&:hover": {
                                        bgcolor: tokens.surface,
                                        color: tokens.textPrimary,
                                        borderColor: tokens.borderHi,
                                    },
                                }}
                            >
                                Корзина
                            </Button>

                            <Button
                                component={Link}
                                href="/checkout"
                                variant="contained"
                                size="small"
                                sx={{
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    px: 2,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    letterSpacing: 0.2,
                                }}
                            >
                                Оформить →
                            </Button>
                        </Stack>

                        {/* Close X */}
                        <IconButton
                            size="small"
                            onClick={() => {
                                sessionStorage.setItem("menuCartBarHidden", "1");
                                setBarVisible(false);
                            }}
                            sx={{
                                width: 28,
                                height: 28,
                                bgcolor: tokens.surfaceUp,
                                border: `1px solid ${tokens.border}`,
                                color: tokens.textMuted,
                                flexShrink: 0,
                                transition: "all 0.18s ease",
                                "&:hover": {
                                    color: tokens.red,
                                    borderColor: tokens.red + "44",
                                    bgcolor: tokens.redDim,
                                },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                    </Box>
                </Box>
            )}
        </Box>
    );
}

"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import Image from "next/image";
import { memo, useEffect, useState } from "react";

import { skeletonShimmerSx, tokens } from "@/shared/ui/theme";

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
    images?: any;
    badges?: ProductBadge[];
    onAddToCart: () => void;
    quantity?: number;
    onIncrease?: () => void;
    onDecrease?: () => void;
    index?: number;
};

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CFG: Record<ProductBadge, { label: string; bg: string }> = {
    hit: { label: "ХИТ", bg: tokens.orange },
    new: { label: "НОВИНКА", bg: "#3B82F6" },
    spicy: { label: "🌶 ОСТРОЕ", bg: tokens.red },
    discount: { label: "", bg: tokens.green },
};

const fmt = new Intl.NumberFormat("ru-RU");

const addTapTransition = {
    type: "spring" as const,
    stiffness: 400,
    damping: 17,
};

// ─── Global keyframes (injected once) ────────────────────────────────────────

const KEYFRAMES = `
@keyframes pc-cart-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(232,93,74,0.2); }
  70%  { box-shadow: 0 0 0 8px rgba(232,93,74,0); }
  100% { box-shadow: 0 0 0 0 rgba(232,93,74,0); }
}
@keyframes pc-shimmer {
  0%   { transform: translateX(-130%) skewX(-18deg); opacity: 0;   }
  20%  { opacity: 1;                                                }
  100% { transform: translateX(230%)  skewX(-18deg); opacity: 0.4; }
}
`;

function ensureKeyframes() {
    if (typeof document === "undefined") return;
    if (document.getElementById("pc-kf-v2")) return;
    const s = document.createElement("style");
    s.id = "pc-kf-v2";
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
    name,
    categoryName,
    composition,
    price,
    originalPrice,
    weight,
    images,
    badges = [],
    onAddToCart,
    quantity = 0,
    onIncrease,
    onDecrease,
    index = 0,
}: ProductCardProps) {
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
        ensureKeyframes();
    }, []);

    const imageUrl = Array.isArray(images) ? images[0] : null;

    const hasInCart = quantity > 0;
    const hasDiscount =
        typeof originalPrice === "number" && originalPrice > price;
    const discountPct = hasDiscount
        ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
        : 0;

    const allBadges: ProductBadge[] =
        hasDiscount && !badges.includes("discount")
            ? ["discount", ...badges]
            : badges;

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            style={{ width: "100%", height: "100%" }}
        >
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 3,
                    overflow: "hidden",
                    bgcolor: "background.paper",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition:
                        "transform 0.28s cubic-bezier(.22,.68,0,1.2), box-shadow 0.28s ease",
                    animation: hasInCart
                        ? "pc-cart-pulse 2.4s ease-in-out infinite"
                        : "none",

                    "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    },

                    ...(hasInCart && {
                        boxShadow: "0 2px 12px rgba(232,93,74,0.22)",
                    }),
                }}
            >
                {/* ── Square image + badges (food-delivery layout) ───────────── */}
                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
                        borderRadius: "12px 12px 0 0",
                        bgcolor: tokens.surfaceHi,
                    }}
                >
                    {!imgLoaded && (
                        <Skeleton
                            variant="rectangular"
                            sx={{
                                position: "absolute",
                                inset: 0,
                                height: "100%",
                                transform: "none",
                                ...skeletonShimmerSx,
                            }}
                        />
                    )}

                    <Image
                        src={imageUrl || "/placeholder.png"}
                        alt={name}
                        fill
                        sizes="(max-width: 600px) 50vw, 25vw"
                        style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                        }}
                        loading="lazy"
                        onLoad={() => setImgLoaded(true)}
                    />

                    {allBadges.length > 0 && (
                        <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{
                                position: "absolute",
                                top: 8,
                                left: 8,
                                zIndex: 5,
                            }}
                        >
                            {allBadges.slice(0, 2).map((badge) => {
                                const cfg = BADGE_CFG[badge];
                                return (
                                    <Box
                                        key={badge}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            px: 0.75,
                                            height: 20,
                                            borderRadius: "6px",
                                            bgcolor: cfg.bg,
                                            color: "#fff",
                                            fontSize: 10,
                                            fontWeight: 800,
                                            letterSpacing: 0.5,
                                            lineHeight: 1,
                                            boxShadow:
                                                "0 1px 3px rgba(0,0,0,0.12)",
                                        }}
                                    >
                                        {badge === "discount" && discountPct > 0
                                            ? `-${discountPct}%`
                                            : cfg.label}
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}

                    {hasInCart && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                zIndex: 5,
                                minWidth: 26,
                                height: 26,
                                px: 0.75,
                                borderRadius: 999,
                                bgcolor: tokens.orange,
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 900,
                                boxShadow: "0 1px 4px rgba(232,93,74,0.35)",
                            }}
                        >
                            {quantity}
                        </Box>
                    )}
                </Box>

                {/* ── Text block ─────────────────────────────────────────────── */}
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        p: 1.5,
                        minHeight: 0,
                    }}
                >
                    {weight && weight > 0 && (
                        <Typography
                            sx={{
                                color: tokens.textMuted,
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: 0.4,
                                lineHeight: 1,
                                mb: 0.5,
                            }}
                        >
                            {weight}&thinsp;г
                        </Typography>
                    )}

                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: tokens.textPrimary,
                            lineHeight: 1.25,
                        }}
                    >
                        {name}
                    </Typography>

                    {categoryName ? (
                        <Chip
                            size="small"
                            label={categoryName}
                            color="secondary"
                            sx={{
                                display: { xs: "none", sm: "flex" },
                                height: 20,
                                fontSize: "12px",
                                mt: 0.75,
                                mb: 0,
                                alignSelf: "flex-start",
                            }}
                        />
                    ) : null}

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: { xs: "none", sm: "-webkit-box" },
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.35,
                            mt: categoryName ? 0.5 : 0.75,
                        }}
                    >
                        {composition || ""}
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: "auto",
                            pt: 1,
                            gap: 1,
                            minWidth: 0,
                        }}
                    >
                        <Box sx={{ minWidth: 0, flex: "1 1 auto", pr: 1 }}>
                            <Typography
                                component="span"
                                sx={{
                                    display: "block",
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                    fontSize: { xs: "1rem", sm: "1.05rem" },
                                    lineHeight: 1,
                                    color: tokens.orange,
                                    letterSpacing: -0.5,
                                }}
                            >
                                {fmt.format(price)}&thinsp;֏
                            </Typography>
                            {hasDiscount && (
                                <Typography
                                    component="span"
                                    sx={{
                                        display: "block",
                                        fontSize: 10,
                                        fontWeight: 500,
                                        color: tokens.textMuted,
                                        textDecoration: "line-through",
                                        lineHeight: 1.4,
                                        mt: 0.15,
                                    }}
                                >
                                    {fmt.format(originalPrice!)}&thinsp;֏
                                </Typography>
                            )}
                        </Box>

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
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        backgroundColor: "#f5f5f5",
                                        color: tokens.textSecondary,
                                        transition:
                                            "color 0.15s ease, background-color 0.15s ease",
                                        "&:hover": {
                                            color: tokens.orange,
                                            bgcolor: "#ebebeb",
                                        },
                                        "&:active": {
                                            transform: "scale(0.85)",
                                        },
                                    }}
                                >
                                    <RemoveIcon fontSize="small" />
                                </IconButton>

                                <Typography
                                    sx={{
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                        minWidth: 20,
                                        textAlign: "center",
                                        color: tokens.textPrimary,
                                        lineHeight: 1,
                                    }}
                                >
                                    {quantity}
                                </Typography>

                                <motion.div
                                    whileTap={{ scale: 0.85 }}
                                    transition={addTapTransition}
                                    style={{
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
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            backgroundColor: "#f5f5f5",
                                            color: tokens.orange,
                                            transition: "background 0.15s ease",
                                            "&:hover": { bgcolor: "#ebebeb" },
                                        }}
                                    >
                                        <AddIcon fontSize="small" />
                                    </IconButton>
                                </motion.div>
                            </Stack>
                        ) : (
                            <motion.div
                                whileTap={{ scale: 0.85 }}
                                transition={addTapTransition}
                                style={{
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
                                        width: 36,
                                        height: 36,
                                        bgcolor: tokens.orange,
                                        color: "#fff",
                                        borderRadius: "50%",
                                        boxShadow: 2,
                                        transition:
                                            "background 0.18s ease, box-shadow 0.18s ease",
                                        "&:hover": {
                                            bgcolor: tokens.orangeHi,
                                            boxShadow: 4,
                                        },
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                            </motion.div>
                        )}
                    </Box>
                </Box>
            </Box>
        </motion.div>
    );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: "background.paper",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Skeleton
                variant="rectangular"
                sx={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    transform: "none",
                    borderRadius: "12px 12px 0 0",
                    ...skeletonShimmerSx,
                }}
            />
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                    minHeight: 0,
                }}
            >
                <Skeleton
                    variant="text"
                    width="88%"
                    sx={{ borderRadius: 1, ...skeletonShimmerSx }}
                />
                <Box
                    sx={{
                        mt: "auto",
                        pt: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Skeleton
                        variant="text"
                        width="40%"
                        sx={{ borderRadius: 1, ...skeletonShimmerSx }}
                    />
                    <Skeleton
                        variant="circular"
                        width={36}
                        height={36}
                        sx={{ ...skeletonShimmerSx }}
                    />
                </Box>
            </Box>
        </Box>
    );
}

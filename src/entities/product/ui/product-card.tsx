"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";
import Image from "next/image";
import { memo, useState } from "react";

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

const fmt = new Intl.NumberFormat("ru-RU");

const addTapTransition = {
    type: "spring" as const,
    stiffness: 400,
    damping: 17,
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
    name,
    price,
    images,
    onAddToCart,
    quantity = 0,
    onIncrease,
    onDecrease,
}: ProductCardProps) {
    const [imgLoaded, setImgLoaded] = useState(false);

    const imageUrl = Array.isArray(images) ? images[0] : null;

    const hasInCart = quantity > 0;

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart();
    };

    return (
        <Box sx={{ width: "100%", height: "100%" }}>
            <Box
                sx={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 3,
                    overflow: "hidden",
                    bgcolor: "#fff",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "box-shadow 0.28s ease",
                    "&:hover": {
                        boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
                    },
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        overflow: "hidden",
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
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        p: 1.5,
                        minHeight: 0,
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: "text.primary",
                            lineHeight: 1.25,
                            mb: 1,
                        }}
                    >
                        {name}
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: "auto",
                            gap: 1,
                            minWidth: 0,
                        }}
                    >
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: "0.85rem", sm: "1rem" },
                                whiteSpace: "nowrap",
                                lineHeight: 1,
                                color: "text.primary",
                                letterSpacing: -0.02,
                                minWidth: 0,
                            }}
                        >
                            {fmt.format(price)}&thinsp;֏
                        </Typography>

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
                                        width: 36,
                                        height: 36,
                                        backgroundColor: "action.hover",
                                        color: "text.secondary",
                                        transition:
                                            "color 0.15s ease, background-color 0.15s ease",
                                        "&:hover": {
                                            bgcolor: "action.selected",
                                        },
                                        "&:active": {
                                            transform: "scale(0.92)",
                                        },
                                    }}
                                >
                                    <RemoveIcon sx={{ fontSize: 20 }} />
                                </IconButton>

                                <Typography
                                    sx={{
                                        fontSize: "0.9rem",
                                        fontWeight: 700,
                                        minWidth: 22,
                                        textAlign: "center",
                                        color: "text.primary",
                                        lineHeight: 1,
                                    }}
                                >
                                    {quantity}
                                </Typography>

                                <motion.div
                                    whileTap={{ scale: 0.92 }}
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
                                        aria-label="Добавить ещё"
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            bgcolor: "primary.main",
                                            color: "#fff",
                                            borderRadius: "50%",
                                            transition:
                                                "background-color 0.18s ease",
                                            "&:hover": {
                                                bgcolor: "primary.dark",
                                            },
                                        }}
                                    >
                                        <AddIcon sx={{ fontSize: 22, color: "#fff" }} />
                                    </IconButton>
                                </motion.div>
                            </Stack>
                        ) : (
                            <motion.div
                                whileTap={{ scale: 0.92 }}
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
                                        bgcolor: "primary.main",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        transition:
                                            "background-color 0.18s ease",
                                        "&:hover": {
                                            bgcolor: "primary.dark",
                                        },
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: 22, color: "#fff" }} />
                                </IconButton>
                            </motion.div>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
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
                bgcolor: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
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

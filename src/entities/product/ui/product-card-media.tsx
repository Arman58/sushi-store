"use client";

import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";

import { Link } from "@/i18n/server";
import { ProductCoverImage } from "@/shared/ui/product-cover-image";
import { tokens } from "@/shared/ui/theme";

import type { BadgeEntry } from "./product-card-shared";

const mediaSx = {
    position: "relative",
    width: "100%",
    aspectRatio: "4 / 3",
    flexShrink: 0,
    overflow: "hidden",
    bgcolor: tokens.surfaceHi,
    borderTopLeftRadius: `${tokens.radiusCardLg}px`,
    borderTopRightRadius: `${tokens.radiusCardLg}px`,
} as const;

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

type ProductCardMediaProps = {
    /** Ссылка на страницу товара; без неё - просто картинка. */
    href?: string | null;
    ariaLabel?: string;
    imageUrl: string | null;
    imageAlt: string;
    imagePriority: boolean;
    badges: BadgeEntry[];
    /** Кнопка избранного показывается только при известном productId. */
    showFavorite: boolean;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    favoriteAriaLabel: string;
};

/** Медиа-зона карточки: фото + бейджи (слева сверху) + избранное (справа). */
export function ProductCardMedia({
    href,
    ariaLabel,
    imageUrl,
    imageAlt,
    imagePriority,
    badges,
    showFavorite,
    isFavorite,
    onToggleFavorite,
    favoriteAriaLabel,
}: ProductCardMediaProps) {
    const content = (
        <>
            <ProductCoverImage
                src={imageUrl}
                alt={imageAlt}
                priority={imagePriority}
            />

            {badges.length > 0 && (
                <Stack
                    direction="column"
                    spacing={0.5}
                    sx={{ position: "absolute", top: 8, left: 8, zIndex: 1 }}
                >
                    {badges.map((b) => (
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

            {showFavorite && (
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onToggleFavorite();
                    }}
                    aria-label={favoriteAriaLabel}
                    sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        zIndex: 1,
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        minHeight: 36,
                        bgcolor: "rgba(var(--ew-surface-rgb), 0.92)",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                        boxShadow: "0 1px 4px rgba(var(--ew-text-rgb), 0.12)",
                        color: isFavorite ? "error.main" : "text.secondary",
                        "&:hover": {
                            bgcolor: "background.paper",
                            color: "error.main",
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
        </>
    );

    if (href) {
        return (
            <Box
                component={Link}
                href={href}
                aria-label={ariaLabel}
                sx={{ ...linkSx, ...mediaSx }}
            >
                {content}
            </Box>
        );
    }

    return <Box sx={mediaSx}>{content}</Box>;
}

"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import NorthWestRoundedIcon from "@mui/icons-material/NorthWestRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useRouter } from "@/i18n/server";
import { tokens } from "@/shared/ui/theme";

type SearchProduct = {
    id: number;
    slug: string;
    name: string;
    price: number;
    image: string | null;
    categoryName: string | null;
    isAvailable: boolean;
};

type SearchCategory = {
    id: number;
    slug: string;
    name: string;
    image: string | null;
};

type SearchResponse = {
    products: SearchProduct[];
    categories: SearchCategory[];
};

const priceFmt = new Intl.NumberFormat("ru-RU");

export function SearchOverlay({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const t = useTranslations("search");
    const locale = useLocale();
    const router = useRouter();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const inputRef = useRef<HTMLInputElement>(null);

    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");

    // Debounce ввода.
    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(query.trim()), 220);
        return () => window.clearTimeout(id);
    }, [query]);

    const enabled = open && debounced.length >= 2;
    const { data, isFetching } = useQuery<SearchResponse>({
        queryKey: ["search", debounced, locale],
        enabled,
        staleTime: 60_000,
        queryFn: async () => {
            const res = await fetch(
                `/api/search?q=${encodeURIComponent(debounced)}&locale=${locale}`,
            );
            if (!res.ok) throw new Error("search failed");
            return (await res.json()) as SearchResponse;
        },
    });

    const go = (href: string) => {
        onClose();
        router.push(href);
    };

    const submitFull = (term: string) => {
        const v = term.trim();
        if (!v) return;
        go(`/menu?search=${encodeURIComponent(v)}`);
    };

    const popularQueries = (t.raw("popularQueries") as string[]) ?? [];
    const hasQuery = debounced.length >= 2;
    const products = data?.products ?? [];
    const categories = data?.categories ?? [];
    const nothing =
        hasQuery && !isFetching && products.length === 0 && categories.length === 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="sm"
            fullWidth
            TransitionProps={{
                onEnter: () => {
                    setQuery("");
                    setDebounced("");
                },
                onEntered: () => inputRef.current?.focus(),
            }}
            sx={{
                "& .MuiDialog-container": {
                    alignItems: fullScreen ? "stretch" : "flex-start",
                },
            }}
            PaperProps={{
                sx: {
                    mt: fullScreen ? 0 : 8,
                    borderRadius: fullScreen ? 0 : 3,
                    overflow: "hidden",
                    // Учитываем «чёлку» на мобилке.
                    pt: fullScreen ? "env(safe-area-inset-top)" : 0,
                },
            }}
        >
            {/* Поисковая строка */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1.25,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    position: "sticky",
                    top: 0,
                    bgcolor: "background.paper",
                    zIndex: 1,
                }}
            >
                <IconButton
                    onClick={onClose}
                    aria-label={t("close")}
                    sx={{ flexShrink: 0 }}
                >
                    {fullScreen ? (
                        <ArrowBackRoundedIcon />
                    ) : (
                        <SearchRoundedIcon />
                    )}
                </IconButton>
                <InputBase
                    inputRef={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") submitFull(query);
                    }}
                    placeholder={t("placeholder")}
                    fullWidth
                    sx={{ fontSize: 16 }}
                    inputProps={{
                        "aria-label": t("open"),
                        enterKeyHint: "search",
                        autoCapitalize: "none",
                        autoCorrect: "off",
                    }}
                />
                {isFetching ? (
                    <CircularProgress size={18} sx={{ flexShrink: 0, mr: 0.5 }} />
                ) : query ? (
                    <IconButton
                        onClick={() => {
                            setQuery("");
                            inputRef.current?.focus();
                        }}
                        aria-label={t("close")}
                        size="small"
                        sx={{ flexShrink: 0 }}
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                ) : null}
            </Box>

            {/* Содержимое */}
            <Box
                sx={{
                    px: 1,
                    py: 1,
                    overflowY: "auto",
                    flex: 1,
                    minHeight: fullScreen ? 0 : 120,
                    maxHeight: fullScreen ? "none" : "60vh",
                    pb: "calc(env(safe-area-inset-bottom) + 8px)",
                }}
            >
                {/* Пустой ввод — популярные запросы */}
                {!hasQuery && (
                    <Box sx={{ px: 1, py: 1 }}>
                        <SectionLabel
                            icon={<TrendingUpRoundedIcon sx={{ fontSize: 16 }} />}
                            text={t("popular")}
                        />
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ flexWrap: "wrap", gap: 1, mt: 1.25 }}
                        >
                            {popularQueries.map((term) => (
                                <Chip
                                    key={term}
                                    label={term}
                                    onClick={() => {
                                        setQuery(term);
                                        inputRef.current?.focus();
                                    }}
                                    sx={{ fontWeight: 600 }}
                                />
                            ))}
                        </Stack>
                        <Typography
                            variant="caption"
                            sx={{
                                color: tokens.textMuted,
                                display: "block",
                                mt: 2,
                                px: 0.5,
                            }}
                        >
                            {t("minHint")}
                        </Typography>
                    </Box>
                )}

                {/* Категории */}
                {hasQuery && categories.length > 0 && (
                    <Box sx={{ mb: 0.5 }}>
                        <Box sx={{ px: 1.5, pt: 1 }}>
                            <SectionLabel text={t("categories")} />
                        </Box>
                        {categories.map((c) => (
                            <ResultRow
                                key={`c-${c.id}`}
                                image={c.image}
                                title={c.name}
                                onClick={() => go(`/menu?category=${c.slug}`)}
                                rounded
                            />
                        ))}
                    </Box>
                )}

                {/* Товары */}
                {hasQuery && products.length > 0 && (
                    <Box>
                        <Box sx={{ px: 1.5, pt: 1 }}>
                            <SectionLabel text={t("products")} />
                        </Box>
                        {products.map((p) => (
                            <ResultRow
                                key={`p-${p.id}`}
                                image={p.image}
                                title={p.name}
                                subtitle={p.categoryName ?? undefined}
                                trailing={`${priceFmt.format(p.price)} ֏`}
                                dimmed={!p.isAvailable}
                                badge={!p.isAvailable ? t("unavailable") : undefined}
                                onClick={() => go(`/menu/${p.slug}`)}
                            />
                        ))}
                        <Box
                            component="button"
                            type="button"
                            onClick={() => submitFull(debounced)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                width: "100%",
                                border: "none",
                                bgcolor: "transparent",
                                cursor: "pointer",
                                px: 2,
                                py: 1.5,
                                mt: 0.5,
                                color: tokens.brand,
                                fontWeight: 700,
                                fontSize: 14,
                                borderTop: "1px solid",
                                borderColor: "divider",
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        >
                            <SearchRoundedIcon sx={{ fontSize: 18 }} />
                            {t("showAll")}
                        </Box>
                    </Box>
                )}

                {/* Ничего не найдено */}
                {nothing && (
                    <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
                        <Typography fontWeight={700}>
                            {t("noResults")}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{ color: tokens.textMuted, mt: 0.5 }}
                        >
                            {t("noResultsHint")}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Dialog>
    );
}

function SectionLabel({
    text,
    icon,
}: {
    text: string;
    icon?: React.ReactNode;
}) {
    return (
        <Stack direction="row" alignItems="center" spacing={0.75}>
            {icon}
            <Typography
                variant="overline"
                sx={{ color: tokens.textMuted, lineHeight: 1.6 }}
            >
                {text}
            </Typography>
        </Stack>
    );
}

function ResultRow({
    image,
    title,
    subtitle,
    trailing,
    onClick,
    rounded = false,
    dimmed = false,
    badge,
}: {
    image: string | null;
    title: string;
    subtitle?: string;
    trailing?: string;
    onClick: () => void;
    rounded?: boolean;
    dimmed?: boolean;
    badge?: string;
}) {
    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                width: "100%",
                border: "none",
                bgcolor: "transparent",
                cursor: "pointer",
                textAlign: "left",
                px: 1.5,
                py: 1,
                borderRadius: 2,
                opacity: dimmed ? 0.55 : 1,
                "&:hover": { bgcolor: "action.hover" },
                "&:active": { transform: "scale(0.99)" },
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    borderRadius: rounded ? "50%" : 2,
                    overflow: "hidden",
                    bgcolor: tokens.surfaceHi,
                }}
            >
                {image ? (
                    <Image
                        src={image}
                        alt=""
                        fill
                        sizes="48px"
                        style={{ objectFit: "cover" }}
                    />
                ) : (
                    <SearchRoundedIcon
                        sx={{
                            position: "absolute",
                            inset: 0,
                            m: "auto",
                            color: tokens.textMuted,
                            fontSize: 20,
                        }}
                    />
                )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    noWrap
                    sx={{ fontWeight: 600, fontSize: 15, color: "text.primary" }}
                >
                    {title}
                </Typography>
                {(subtitle || badge) && (
                    <Typography
                        noWrap
                        variant="caption"
                        sx={{ color: tokens.textMuted }}
                    >
                        {badge ?? subtitle}
                    </Typography>
                )}
            </Box>
            {trailing ? (
                <Typography
                    sx={{
                        flexShrink: 0,
                        fontWeight: 800,
                        fontSize: 14,
                        color: "text.primary",
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {trailing}
                </Typography>
            ) : (
                <NorthWestRoundedIcon
                    sx={{ fontSize: 18, color: tokens.textMuted, flexShrink: 0 }}
                />
            )}
        </Box>
    );
}

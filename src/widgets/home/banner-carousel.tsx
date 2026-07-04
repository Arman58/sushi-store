"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Link } from "@/i18n/server";
import { cloudinaryImageLoader } from "@/shared/lib/cloudinary-loader";
import { tokens } from "@/shared/ui/theme";

const AUTOPLAY_MS = 5_000;
/** Пауза автопрокрутки после касания/свайпа пользователем. */
const RESUME_AFTER_TOUCH_MS = 8_000;

export type BannerCarouselItem = {
    id: number;
    image: string;
    title: string;
    cta: string;
    href: string | null;
};

/**
 * Mobile-first карусель баннеров: scroll-snap + автопрокрутка каждые 5 сек,
 * точки-индикаторы, пауза при наведении/касании, prefers-reduced-motion.
 */
export function BannerCarousel({ items }: { items: BannerCarouselItem[] }) {
    const listRef = useRef<HTMLUListElement>(null);
    const [active, setActive] = useState(0);
    const pausedRef = useRef(false);
    const resumeTimerRef = useRef<number | null>(null);

    // Активная точка - по фактической прокрутке (и свайп, и автоплей)
    const handleScroll = () => {
        const el = listRef.current;
        if (!el) return;
        let best = 0;
        let bestDist = Infinity;
        Array.from(el.children).forEach((child, i) => {
            const dist = Math.abs(
                (child as HTMLElement).offsetLeft - el.scrollLeft,
            );
            if (dist < bestDist) {
                bestDist = dist;
                best = i;
            }
        });
        setActive(best);
    };

    const scrollToIndex = (index: number) => {
        const el = listRef.current;
        const child = el?.children[index] as HTMLElement | undefined;
        if (!el || !child) return;
        el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    };

    const pauseByTouch = () => {
        pausedRef.current = true;
        if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = window.setTimeout(() => {
            pausedRef.current = false;
        }, RESUME_AFTER_TOUCH_MS);
    };

    useEffect(() => {
        if (items.length < 2) return;
        if (
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            return;
        }
        const id = window.setInterval(() => {
            if (pausedRef.current || document.hidden) return;
            const el = listRef.current;
            if (!el) return;
            let current = 0;
            let bestDist = Infinity;
            Array.from(el.children).forEach((child, i) => {
                const dist = Math.abs(
                    (child as HTMLElement).offsetLeft - el.scrollLeft,
                );
                if (dist < bestDist) {
                    bestDist = dist;
                    current = i;
                }
            });
            const next = (current + 1) % items.length;
            const child = el.children[next] as HTMLElement | undefined;
            if (child) {
                el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
            }
        }, AUTOPLAY_MS);
        return () => {
            window.clearInterval(id);
            if (resumeTimerRef.current)
                window.clearTimeout(resumeTimerRef.current);
        };
    }, [items.length]);

    return (
        <Box
            onMouseEnter={() => {
                pausedRef.current = true;
            }}
            onMouseLeave={() => {
                pausedRef.current = false;
            }}
            onTouchStart={pauseByTouch}
        >
            <Box
                component="ul"
                ref={listRef}
                onScroll={handleScroll}
                sx={{
                    display: "flex",
                    gap: 1.5,
                    m: 0,
                    p: 0,
                    listStyle: "none",
                    overflowX: "auto",
                    scrollSnapType: "x mandatory",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                    mx: { xs: -2, md: 0 },
                    px: { xs: 2, md: 0 },
                }}
            >
                {items.map((banner) => {
                    const inner = (
                        <Box
                            sx={{
                                position: "relative",
                                width: "100%",
                                aspectRatio: "5 / 2",
                                borderRadius: `${tokens.radiusCardLg}px`,
                                overflow: "hidden",
                                bgcolor: tokens.surfaceHi,
                            }}
                        >
                            <Image
                    loader={cloudinaryImageLoader}
                                src={banner.image}
                                alt={banner.title || "promo"}
                                fill
                                sizes="(max-width: 600px) 86vw, (max-width: 900px) 480px, 1152px"
                                style={{ objectFit: "cover" }}
                            />
                            {banner.title ? (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "flex-end",
                                        alignItems: "flex-start",
                                        gap: 0.75,
                                        px: 2,
                                        py: 1.75,
                                        background:
                                            "linear-gradient(to top, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.25) 55%, transparent 80%)",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "#FFF",
                                            fontWeight: 800,
                                            lineHeight: 1.2,
                                            letterSpacing: -0.3,
                                            fontSize: {
                                                xs: "1.05rem",
                                                sm: "1.3rem",
                                            },
                                            textShadow:
                                                "0 1px 8px rgba(0,0,0,0.45)",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {banner.title}
                                    </Typography>
                                    {banner.href ? (
                                        <Box
                                            sx={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                                px: 1.5,
                                                py: 0.6,
                                                borderRadius: 999,
                                                bgcolor:
                                                    "rgba(255,255,255,0.94)",
                                                color: "#1E8449",
                                                fontWeight: 800,
                                                fontSize: 13,
                                                lineHeight: 1,
                                            }}
                                        >
                                            {banner.cta} →
                                        </Box>
                                    ) : null}
                                </Box>
                            ) : null}
                        </Box>
                    );

                    return (
                        <Box
                            component="li"
                            key={banner.id}
                            sx={{
                                flexShrink: 0,
                                scrollSnapAlign: "start",
                                width: { xs: "86vw", sm: 480, md: "100%" },
                                maxWidth: "100%",
                            }}
                        >
                            {banner.href?.startsWith("/") ? (
                                <Link
                                    href={banner.href}
                                    aria-label={banner.title || "promo"}
                                    style={{
                                        display: "block",
                                        textDecoration: "none",
                                    }}
                                >
                                    {inner}
                                </Link>
                            ) : banner.href ? (
                                <a
                                    href={banner.href}
                                    target="_blank"
                                    rel="noopener"
                                    aria-label={banner.title || "promo"}
                                    style={{
                                        display: "block",
                                        textDecoration: "none",
                                    }}
                                >
                                    {inner}
                                </a>
                            ) : (
                                inner
                            )}
                        </Box>
                    );
                })}
            </Box>

            {/* Точки-индикаторы */}
            {items.length > 1 && (
                <Stack
                    direction="row"
                    spacing={0.75}
                    justifyContent="center"
                    sx={{ mt: 1.25 }}
                >
                    {items.map((banner, i) => (
                        <Box
                            key={banner.id}
                            component="button"
                            type="button"
                            aria-label={`Слайд ${i + 1}`}
                            aria-current={active === i}
                            onClick={() => {
                                pauseByTouch();
                                scrollToIndex(i);
                            }}
                            sx={{
                                width: active === i ? 18 : 8,
                                height: 8,
                                borderRadius: 999,
                                border: "none",
                                p: 0,
                                cursor: "pointer",
                                bgcolor:
                                    active === i
                                        ? tokens.brand
                                        : tokens.borderHi,
                                transition:
                                    "width 0.25s ease, background-color 0.25s ease",
                            }}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
}

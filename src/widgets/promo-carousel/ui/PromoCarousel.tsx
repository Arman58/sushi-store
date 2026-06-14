"use client";

import "swiper/css";
import "swiper/css/pagination";

import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { Link } from "@/i18n/server";
import { AppButton } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

const SLIDES = [
    {
        id: "sets",
        imageUrl:
            "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1600&q=80",
        href: "/menu",
    },
    {
        id: "hot",
        imageUrl:
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1600&q=80",
        href: "/menu",
    },
    {
        id: "fresh",
        imageUrl:
            "https://images.unsplash.com/photo-1534256958597-7fe685cbd745?auto=format&fit=crop&w=1600&q=80",
        href: "/menu",
    },
] as const;

function PromoSlideCard({
    slide,
    subtitle,
    title,
    buttonLabel,
    imageAlt,
    priority = false,
}: {
    slide: (typeof SLIDES)[number];
    subtitle: string;
    title: string;
    buttonLabel: string;
    imageAlt: string;
    priority?: boolean;
}) {
    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                height: { xs: "220px", sm: "320px", md: "420px" },
                borderRadius: { xs: 2, md: 3 },
                overflow: "hidden",
                bgcolor: tokens.textPrimary,
            }}
        >
            <Image
                src={slide.imageUrl}
                alt={imageAlt}
                fill
                sizes="(max-width: 600px) 100vw, 960px"
                style={{ objectFit: "cover" }}
                {...(priority
                    ? { priority: true, fetchPriority: "high" as const }
                    : { loading: "lazy" })}
            />

            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    background: `
                        linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%),
                        linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 55%)
                    `,
                }}
            />

            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    alignItems: { xs: "stretch", md: "flex-start" },
                    p: { xs: 2, md: 5 },
                    gap: { xs: 0.75, md: 1.5 },
                    maxWidth: { xs: "100%", md: "72%" },
                }}
            >
                <Typography
                    variant="overline"
                    sx={{
                        color: "rgba(255,255,255,0.78)",
                        letterSpacing: "0.12em",
                        fontWeight: 700,
                        lineHeight: 1.25,
                        fontSize: { xs: "0.7rem", md: "0.9rem" },
                    }}
                >
                    {subtitle}
                </Typography>

                <Typography
                    component="h2"
                    variant="h4"
                    sx={{
                        color: "#fff",
                        fontWeight: 800,
                        lineHeight: 1.12,
                        letterSpacing: -0.5,
                        fontSize: { xs: "1.5rem", md: "2.5rem" },
                    }}
                >
                    {title}
                </Typography>

                <AppButton
                    component={Link}
                    href={slide.href}
                    variant="contained"
                    size="large"
                    sx={{
                        mt: { xs: 0.5, md: 1 },
                        px: { xs: 2, md: 3 },
                        py: { xs: 1.1, md: 1.25 },
                        width: { xs: "100%", sm: "auto" },
                        alignSelf: { xs: "stretch", sm: "flex-start" },
                        fontSize: { xs: "0.875rem", md: "1rem" },
                        boxShadow: `0 6px 20px rgba(0, 179, 65, 0.45)`,
                    }}
                >
                    {buttonLabel}
                </AppButton>
            </Box>
        </Box>
    );
}

export function PromoCarousel() {
    const t = useTranslations("home");
    const theme = useTheme();

    const slides = useMemo(
        () =>
            SLIDES.map((slide) => ({
                ...slide,
                subtitleKey: `promo_${slide.id}_subtitle` as const,
                titleKey: `promo_${slide.id}_title` as const,
                buttonKey: `promo_${slide.id}_btn` as const,
                imageAltKey: `promo_${slide.id}_image_alt` as const,
            })),
        [],
    );

    return (
        <Box
            sx={{
                "& .swiper-pagination-bullet": {
                    bgcolor: "rgba(255,255,255,0.45)",
                    opacity: 1,
                    width: 6,
                    height: 6,
                    margin: "0 3px !important",
                    [theme.breakpoints.up("md")]: {
                        width: 8,
                        height: 8,
                        margin: "0 4px !important",
                    },
                },
                "& .swiper-pagination-bullet-active": {
                    bgcolor: tokens.brand,
                    width: 14,
                    borderRadius: 999,
                    [theme.breakpoints.up("md")]: {
                        width: 24,
                    },
                },
                "& .swiper-pagination": {
                    bottom: { xs: 8, md: 12 },
                },
            }}
        >
            <Swiper
                modules={[Autoplay, Pagination]}
                autoplay={{
                    delay: 4000,
                    disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                loop
                slidesPerView={1}
                spaceBetween={0}
                style={{
                    paddingBottom: 28,
                    borderRadius: 12,
                }}
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={slide.id}>
                        <PromoSlideCard
                            slide={slide}
                            subtitle={t(slide.subtitleKey)}
                            title={t(slide.titleKey)}
                            buttonLabel={t(slide.buttonKey)}
                            imageAlt={t(slide.imageAltKey)}
                            priority={index === 0}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </Box>
    );
}

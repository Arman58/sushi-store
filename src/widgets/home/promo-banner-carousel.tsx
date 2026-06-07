"use client";

import "swiper/css";
import "swiper/css/pagination";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { isAllowedProductImageSrc } from "@/shared/lib/product-cover";

export type PromoBannerSlide = {
    title: string;
    subtitle: string;
    gradient: string;
    href?: string;
    imageUrl?: string;
};

type PromoBannerCarouselProps = {
    slides: PromoBannerSlide[];
};

function SlideContent({
    slide,
    priority = false,
}: {
    slide: PromoBannerSlide;
    priority?: boolean;
}) {
    const showImage =
        slide.imageUrl && isAllowedProductImageSrc(slide.imageUrl);

    return (
        <Box
            sx={{
                height: 160,
                borderRadius: 4,
                background: slide.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 3,
                gap: 2,
                overflow: "hidden",
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography color="white" fontWeight={800} variant="h5" noWrap>
                    {slide.title}
                </Typography>
                <Typography
                    color="rgba(255,255,255,0.9)"
                    variant="body1"
                    sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {slide.subtitle}
                </Typography>
            </Box>
            {showImage && (
                <Box
                    sx={{
                        position: "relative",
                        width: 112,
                        height: 112,
                        borderRadius: 3,
                        overflow: "hidden",
                        flexShrink: 0,
                        bgcolor: "rgba(255,255,255,0.12)",
                    }}
                >
                    <Image
                        src={slide.imageUrl!}
                        alt={slide.title}
                        fill
                        sizes="112px"
                        style={{ objectFit: "cover" }}
                        {...(priority
                            ? { priority: true, fetchPriority: "high" as const }
                            : { loading: "lazy" })}
                    />
                </Box>
            )}
        </Box>
    );
}

export function PromoBannerCarousel({ slides }: PromoBannerCarouselProps) {
    if (slides.length === 0) return null;

    return (
        <Swiper
            autoplay={{
                delay: 4000,
                disableOnInteraction: false,
            }}
            breakpoints={{
                600: {
                    slidesPerView: slides.length > 1 ? 1.4 : 1,
                },
            }}
            loop={slides.length > 1}
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            slidesPerView={1.1}
            spaceBetween={16}
            style={{ paddingBottom: 30 }}
        >
            {slides.map((slide, index) => {
                const inner = <SlideContent slide={slide} priority={index === 0} />;
                const key = `${slide.title}-${index}`;

                if (slide.href) {
                    return (
                        <SwiperSlide key={key}>
                            <Box
                                component={Link}
                                href={slide.href}
                                sx={{
                                    display: "block",
                                    textDecoration: "none",
                                    color: "inherit",
                                }}
                            >
                                {inner}
                            </Box>
                        </SwiperSlide>
                    );
                }

                return <SwiperSlide key={key}>{inner}</SwiperSlide>;
            })}
        </Swiper>
    );
}

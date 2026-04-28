"use client";

import "swiper/css";
import "swiper/css/pagination";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

export function PromoBannerCarousel() {
    return (
        <Swiper
            autoplay={{
                delay: 3000,
                disableOnInteraction: false,
            }}
            breakpoints={{
                600: {
                    slidesPerView: 1.4,
                },
            }}
            loop
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            slidesPerView={1.1}
            spaceBetween={16}
            style={{ paddingBottom: 30 }}
        >
            <SwiperSlide>
                <Box
                    sx={{
                        height: 160,
                        borderRadius: 4,
                        background:
                            "linear-gradient(135deg, #E85D4A 0%, #FFB74D 100%)",
                        display: "flex",
                        alignItems: "center",
                        p: 3,
                    }}
                >
                    <Box>
                        <Typography
                            color="white"
                            fontWeight={800}
                            variant="h5"
                        >
                            Бесплатная доставка
                        </Typography>
                        <Typography
                            color="rgba(255,255,255,0.9)"
                            variant="body1"
                        >
                            При заказе от 5000֏
                        </Typography>
                    </Box>
                </Box>
            </SwiperSlide>

            <SwiperSlide>
                <Box
                    sx={{
                        height: 160,
                        borderRadius: 4,
                        background:
                            "linear-gradient(135deg, #2DB5A0 0%, #2E7D32 100%)",
                        display: "flex",
                        alignItems: "center",
                        p: 3,
                    }}
                >
                    <Box>
                        <Typography
                            color="white"
                            fontWeight={800}
                            variant="h5"
                        >
                            Свежие суши каждый день
                        </Typography>
                        <Typography
                            color="rgba(255,255,255,0.9)"
                            variant="body1"
                        >
                            Готовим утром — привозим днём
                        </Typography>
                    </Box>
                </Box>
            </SwiperSlide>

            <SwiperSlide>
                <Box
                    sx={{
                        height: 160,
                        borderRadius: 4,
                        background:
                            "linear-gradient(135deg, #5C6BC0 0%, #9575CD 100%)",
                        display: "flex",
                        alignItems: "center",
                        p: 3,
                    }}
                >
                    <Box>
                        <Typography
                            color="white"
                            fontWeight={800}
                            variant="h5"
                        >
                            Новинка: Острый Лахмаджо
                        </Typography>
                        <Typography
                            color="rgba(255,255,255,0.9)"
                            variant="body1"
                        >
                            Уже в меню — попробуй первым
                        </Typography>
                    </Box>
                </Box>
            </SwiperSlide>
        </Swiper>
    );
}

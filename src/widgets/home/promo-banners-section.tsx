import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { getLocale } from "next-intl/server";

import { Link } from "@/i18n/server";
import { getLocalizedField } from "@/lib/i18n-utils";
import { prisma } from "@/lib/prisma";
import { tokens } from "@/shared/ui/theme";

const sectionContainerSx = {
    maxWidth: "lg",
    px: { xs: 2, md: 6 },
} as const;

/**
 * Промо-баннеры из админки: горизонтальная scroll-snap лента (mobile-first),
 * активные и попадающие в окно дат. Ничего не рендерит, если баннеров нет.
 */
export async function PromoBannersSection() {
    const locale = await getLocale();

    let banners: {
        id: number;
        image: string;
        title: unknown;
        href: string | null;
    }[] = [];
    try {
        const now = new Date();
        banners = await prisma.banner.findMany({
            where: {
                isActive: true,
                OR: [{ startsAt: null }, { startsAt: { lte: now } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
            },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            take: 8,
            select: { id: true, image: true, title: true, href: true },
        });
    } catch {
        return null;
    }

    if (banners.length === 0) return null;

    return (
        <Container sx={{ ...sectionContainerSx, mt: { xs: 2.5, md: 4 } }}>
            <Box
                component="ul"
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
                {banners.map((banner) => {
                    const title = getLocalizedField(banner.title, locale);
                    const inner = (
                        <Box
                            sx={{
                                position: "relative",
                                width: {
                                    xs: "86vw",
                                    sm: 480,
                                    md: banners.length === 1 ? "100%" : 560,
                                },
                                maxWidth: "100%",
                                aspectRatio: "5 / 2",
                                borderRadius: `${tokens.radiusCardLg}px`,
                                overflow: "hidden",
                                bgcolor: tokens.surfaceHi,
                            }}
                        >
                            <Image
                                src={banner.image}
                                alt={title || "promo"}
                                fill
                                sizes="(max-width: 600px) 86vw, 560px"
                                style={{ objectFit: "cover" }}
                            />
                            {title ? (
                                <Typography
                                    sx={{
                                        position: "absolute",
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        px: 2,
                                        py: 1.25,
                                        color: "#FFF",
                                        fontWeight: 800,
                                        fontSize: { xs: "1rem", sm: "1.15rem" },
                                        textShadow: "0 1px 8px rgba(0,0,0,0.55)",
                                        background:
                                            "linear-gradient(transparent, rgba(0,0,0,0.55))",
                                    }}
                                >
                                    {title}
                                </Typography>
                            ) : null}
                        </Box>
                    );

                    return (
                        <Box
                            component="li"
                            key={banner.id}
                            sx={{ flexShrink: 0, scrollSnapAlign: "start" }}
                        >
                            {banner.href ? (
                                <Box
                                    component={Link}
                                    href={banner.href}
                                    aria-label={title || "promo"}
                                    sx={{ display: "block", textDecoration: "none" }}
                                >
                                    {inner}
                                </Box>
                            ) : (
                                inner
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Container>
    );
}

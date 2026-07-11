"use client";

import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Image from "next/image";
import { useMemo, useState } from "react";

import { SITE_LOGO_PATH } from "@/lib/site-config";
import { cloudinaryImageLoader } from "@/shared/lib/cloudinary-loader";
import { sanitizeProductImageSrc } from "@/shared/lib/product-cover";

import { tokens } from "./theme";

type ProductCoverImageProps = {
    src: string | null;
    alt: string;
    priority?: boolean;
    sizes?: string;
};

export function ProductCoverPlaceholder() {
    return (
        <Box
            sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                bgcolor: tokens.surfaceHi,
                color: tokens.textMuted,
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    overflow: "hidden",
                    opacity: 0.85,
                }}
            >
                <Image
                    src={SITE_LOGO_PATH}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    style={{ objectFit: "cover" }}
                />
            </Box>
            <RestaurantMenuRoundedIcon
                aria-hidden
                focusable="false"
                sx={{ fontSize: 28, opacity: 0.35 }}
            />
        </Box>
    );
}

export function ProductCoverImage({
    src,
    alt,
    priority = false,
    sizes = "(max-width: 600px) 50vw, 25vw",
}: ProductCoverImageProps) {
    const safeSrc = useMemo(() => sanitizeProductImageSrc(src), [src]);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    const showPhoto = Boolean(safeSrc) && !failed;

    if (!showPhoto) {
        return <ProductCoverPlaceholder />;
    }

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            {!loaded && !priority && (
                <Skeleton
                    variant="rectangular"
                    animation="wave"
                    sx={{
                        position: "absolute",
                        inset: 0,
                        height: "100%",
                        transform: "none",
                    }}
                />
            )}
            <Image
                src={safeSrc!}
                alt={alt}
                fill
                loader={cloudinaryImageLoader}
                sizes={sizes}
                priority={priority}
                style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                }}
                {...(priority
                    ? { fetchPriority: "high" as const }
                    : { loading: "lazy" as const })}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
            />
        </div>
    );
}

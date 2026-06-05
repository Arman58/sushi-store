"use client";

import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Image from "next/image";
import { useMemo, useState } from "react";

import { sanitizeProductImageSrc } from "@/shared/lib/product-cover";

import { tokens } from "./theme";

type ProductCoverImageProps = {
    src: string | null;
    alt: string;
    priority?: boolean;
    sizes?: string;
};

function ProductCoverPlaceholder() {
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
                component="img"
                src="/east-west-logo.png"
                alt=""
                aria-hidden
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    objectFit: "cover",
                    opacity: 0.85,
                }}
            />
            <RestaurantMenuRoundedIcon sx={{ fontSize: 28, opacity: 0.35 }} />
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
        <>
            {!loaded && (
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
                sizes={sizes}
                style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                }}
                {...(priority
                    ? { priority: true, fetchPriority: "high" as const }
                    : { loading: "lazy" })}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
            />
        </>
    );
}

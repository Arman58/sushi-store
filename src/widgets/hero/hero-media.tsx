"use client";

import Image from "next/image";

import { HERO_IMAGE_URL } from "@/lib/site-config";
import { cloudinaryImageLoader } from "@/shared/lib/cloudinary-loader";

/**
 * LCP hero image. Client component so `loader` can be passed to next/image
 * (functions are not serializable across the RSC boundary).
 * Still SSR'd into the initial HTML — must not wait on Prisma / Suspense.
 */
export function HeroMedia() {
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <Image
                loader={cloudinaryImageLoader}
                src={HERO_IMAGE_URL}
                alt="Sushi sets"
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                style={{ objectFit: "cover" }}
                priority
                fetchPriority="high"
            />
        </div>
    );
}

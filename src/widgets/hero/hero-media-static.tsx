import { preload } from "react-dom";

import { HERO_IMAGE_URL } from "@/lib/site-config";
import {
    buildLcpImageUrl,
    buildLcpSrcSet,
} from "@/shared/lib/lcp-image-url";

const HERO_WIDTHS = [640, 828, 1080, 1200] as const;
const HERO_SIZES = "(max-width: 1200px) 100vw, 1200px";

/**
 * LCP hero — чистый <img> в серверном HTML + react-dom preload.
 * Без client next/image: меньше JS до первой отрисовки.
 */
export function HeroMediaStatic() {
    const src = buildLcpImageUrl(HERO_IMAGE_URL, 828);
    const srcSet = buildLcpSrcSet(HERO_IMAGE_URL, HERO_WIDTHS);

    preload(src, { as: "image", fetchPriority: "high" });

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                srcSet={srcSet}
                sizes={HERO_SIZES}
                alt="Sushi sets"
                fetchPriority="high"
                decoding="async"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                }}
            />
        </div>
    );
}

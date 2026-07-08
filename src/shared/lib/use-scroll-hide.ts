"use client";

import { useMotionValueEvent, useScroll } from "framer-motion";
import { useRef, useState } from "react";

/** Скрывает UI при скролле вниз; setState только при смене значения. */
export function useScrollHide(threshold = 150): boolean {
    const { scrollY } = useScroll();
    const [hidden, setHidden] = useState(false);
    const hiddenRef = useRef(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        const nextHidden = latest > previous && latest > threshold;
        if (nextHidden === hiddenRef.current) return;
        hiddenRef.current = nextHidden;
        setHidden(nextHidden);
    });

    return hidden;
}

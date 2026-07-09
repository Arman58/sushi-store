"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

import { THEME_INIT_SCRIPT } from "@/lib/theme-preference";

/**
 * Injects the FOUC-prevention theme script into the SSR HTML stream
 * outside the client React tree — avoids React 19's
 * "Encountered a script tag while rendering React component" warning.
 */
export function ThemeInitScript({ nonce }: { nonce?: string }) {
    const inserted = useRef(false);

    useServerInsertedHTML(() => {
        if (inserted.current) return null;
        inserted.current = true;
        return (
            <script
                nonce={nonce}
                dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
            />
        );
    });

    return null;
}

"use client";

import { useEffect } from "react";

import { redirectToCanonicalHost } from "@/lib/canonical-host";

/** Запасной редирект apex → www (PWA из кэша без inline-скрипта). */
export function CanonicalHostRedirect() {
    useEffect(() => {
        redirectToCanonicalHost();
    }, []);

    return null;
}

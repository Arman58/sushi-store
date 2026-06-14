import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NOINDEX_METADATA } from "@/lib/seo/metadata";

export const metadata: Metadata = NOINDEX_METADATA;

export default function CartLayout({ children }: { children: ReactNode }) {
    return children;
}

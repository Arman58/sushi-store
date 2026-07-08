import type { Metadata } from "next";

import { NOINDEX_METADATA } from "@/lib/seo/metadata";

import { ProfileSavedAddressesSection } from "../profile-saved-addresses-section";

export const metadata: Metadata = NOINDEX_METADATA;
export const dynamic = "force-dynamic";

export default function ProfileAddressesPage() {
    return (
        <ProfileSavedAddressesSection />
    );
}

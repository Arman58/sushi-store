"use client";

import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Link } from "@/i18n/server";
import {
    FatalErrorHomeButton,
    FatalErrorScreen,
} from "@/shared/ui/fatal-error-screen";

export default function LocaleError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("fatalError");

    useEffect(() => {
        console.error(error);
        Sentry.captureException(error);
    }, [error]);

    return (
        <FatalErrorScreen
            badge={t("badge")}
            heading={t("heading")}
            body={t("body")}
            retryLabel={t("retryCta")}
            onRetry={reset}
            secondaryAction={
                <Link href="/" style={{ textDecoration: "none" }}>
                    <FatalErrorHomeButton component="button" href="/" label={t("homeCta")} />
                </Link>
            }
        />
    );
}

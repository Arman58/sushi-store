"use client";

import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import Button from "@mui/material/Button";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { FatalErrorScreen } from "@/shared/ui/fatal-error-screen";

const ADMIN_DASHBOARD_PATH = "/admin/orders";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("admin.error");

    useEffect(() => {
        console.error(error);
        Sentry.captureException(error);
    }, [error]);

    return (
        <FatalErrorScreen
            badge={t("badge")}
            heading={t("heading")}
            body={t("body")}
            retryLabel={t("retry")}
            onRetry={reset}
            secondaryAction={
                <Button
                    component="a"
                    href={ADMIN_DASHBOARD_PATH}
                    variant="outlined"
                    size="large"
                    startIcon={<DashboardOutlined />}
                    sx={{
                        borderRadius: 999,
                        px: 3.5,
                        py: 1.25,
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#F8F6F3",
                        borderColor: "rgba(248,246,243,0.28)",
                        "&:hover": {
                            borderColor: "rgba(248,246,243,0.5)",
                            bgcolor: "rgba(255,255,255,0.06)",
                        },
                    }}
                >
                    {t("backToDashboard")}
                </Button>
            }
        />
    );
}

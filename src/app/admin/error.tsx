"use client";

import * as Sentry from "@sentry/nextjs";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import Button from "@mui/material/Button";
import { useEffect } from "react";

import {
    FatalErrorScreen,
} from "@/shared/ui/fatal-error-screen";

const ADMIN_DASHBOARD_PATH = "/admin/orders";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
        Sentry.captureException(error);
    }, [error]);

    return (
        <FatalErrorScreen
            badge="500"
            heading="Что-то пошло не так"
            body="Панель управления временно недоступна. Мы уже получили уведомление и разбираемся с проблемой."
            retryLabel="Попробовать снова"
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
                    Вернуться в панель управления
                </Button>
            }
        />
    );
}

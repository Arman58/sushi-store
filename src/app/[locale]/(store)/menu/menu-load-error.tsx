"use client";

import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function MenuLoadError() {
    const t = useTranslations("menu");
    const router = useRouter();

    return (
        <Alert
            severity="error"
            action={
                <Button
                    color="inherit"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => router.refresh()}
                >
                    {t("retry")}
                </Button>
            }
        >
            <Stack spacing={1}>
                <span>{t("load_error")}</span>
            </Stack>
        </Alert>
    );
}

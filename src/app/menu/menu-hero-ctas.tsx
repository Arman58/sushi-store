"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";

const actionBoxSx = {
    border: "1px solid #e0e0e0",
    borderRadius: 2,
    px: 2,
    py: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 1,
    cursor: "pointer",
    color: "text.primary",
    fontSize: "0.875rem",
    fontWeight: 500,
    "&:hover": {
        backgroundColor: "#fafafa",
    },
} as const;

const TEL = "tel:+37400000000";

function goToTel() {
    if (typeof window === "undefined") return;
    window.location.assign(TEL);
}

export function MenuHeroCtas() {
    const router = useRouter();

    const activate =
        (fn: () => void) =>
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fn();
            }
        };

    const goOrderStatus = () => {
        router.push("/order-status");
    };

    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ mt: 3 }}
            alignItems={{ xs: "stretch", sm: "center" }}
        >
            <Box
                role="button"
                tabIndex={0}
                onClick={goOrderStatus}
                onKeyDown={activate(goOrderStatus)}
                sx={actionBoxSx}
            >
                Проверить заказ
            </Box>
            <Box
                role="button"
                tabIndex={0}
                onClick={goToTel}
                onKeyDown={activate(goToTel)}
                sx={actionBoxSx}
            >
                Позвонить
            </Box>
        </Stack>
    );
}

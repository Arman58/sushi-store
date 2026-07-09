"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useState } from "react";

import { useCartStore } from "@/features/cart";

/**
 * Тосты для админки (LayoutShell на /admin не монтируется).
 * Использует тот же showAppToast / cart store, что и витрина.
 */
export function AdminToastHost() {
    const addToast = useCartStore((s) => s.addToast);
    const message = useCartStore((s) => s.appToastMessage);
    const severity = useCartStore((s) => s.appToastSeverity);
    const [dismissedToastId, setDismissedToastId] = useState(0);

    const open =
        Boolean(message) && addToast !== 0 && dismissedToastId !== addToast;

    if (!message) return null;

    return (
        <Snackbar
            open={open}
            autoHideDuration={severity === "error" ? 5000 : 3500}
            onClose={() => setDismissedToastId(addToast)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{ bottom: { xs: 24, sm: 24 } }}
        >
            <Alert
                onClose={() => setDismissedToastId(addToast)}
                severity={severity === "error" ? "error" : "success"}
                variant="filled"
                sx={{ width: "100%", fontWeight: 600 }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
}

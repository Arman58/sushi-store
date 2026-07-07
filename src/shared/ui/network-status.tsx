"use client";

import SignalWifiOffOutlinedIcon from "@mui/icons-material/SignalWifiOffOutlined";
import WifiOutlinedIcon from "@mui/icons-material/WifiOutlined";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type NetworkState = "online" | "offline" | null;

export function NetworkStatus() {
    const t = useTranslations("pwa");
    const [state, setState] = useState<NetworkState>(null);
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        const handleOffline = () => {
            wasOfflineRef.current = true;
            setState("offline");
        };

        const handleOnline = () => {
            // Only show "restored" toast if we were previously offline
            if (wasOfflineRef.current) {
                setState("online");
                wasOfflineRef.current = false;
            }
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        // Check initial state via microtask to avoid synchronous setState in effect
        if (!navigator.onLine) {
            wasOfflineRef.current = true;
            queueMicrotask(() => setState("offline"));
        }

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    const isOffline = state === "offline";
    const isOnline = state === "online";
    const open = isOffline || isOnline;

    return (
        <Snackbar
            open={open}
            autoHideDuration={isOnline ? 3000 : null}
            onClose={(_e, reason) => {
                if (reason === "clickaway") return;
                if (isOnline) setState(null);
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{
                bottom: {
                    xs: "calc(72px + env(safe-area-inset-bottom))",
                    sm: 24,
                },
                "& .MuiSnackbarContent-root": {
                    minWidth: "auto",
                },
            }}
            message={
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        fontWeight: 600,
                        fontSize: 14,
                    }}
                >
                    {isOffline ? (
                        <SignalWifiOffOutlinedIcon
                            sx={{ fontSize: 20, color: "#EF5350" }}
                        />
                    ) : (
                        <WifiOutlinedIcon
                            sx={{ fontSize: 20, color: "#66BB6A" }}
                        />
                    )}
                    {isOffline ? t("offline") : t("online")}
                </Box>
            }
            ContentProps={{
                sx: {
                    bgcolor: isOffline
                        ? "rgba(211, 47, 47, 0.95)"
                        : "rgba(46, 125, 50, 0.95)",
                    color: "#fff",
                    borderRadius: 3,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    backdropFilter: "blur(8px)",
                    justifyContent: "center",
                    minWidth: "auto",
                    px: 2.5,
                    py: 0.75,
                },
            }}
        />
    );
}

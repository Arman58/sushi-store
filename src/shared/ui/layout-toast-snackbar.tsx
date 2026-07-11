"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/react/shallow";

import { useCartStore } from "@/features/cart";

export function LayoutToastSnackbar() {
    const tCommon = useTranslations("common");
    const {
        addToast,
        setAddToast,
        lastAddedTitle,
        appToastMessage,
        appToastMessageKey,
        appToastSeverity,
    } = useCartStore(
        useShallow((state) => ({
            addToast: state.addToast,
            setAddToast: state.setAddToast,
            lastAddedTitle: state.lastAddedTitle,
            appToastMessage: state.appToastMessage,
            appToastMessageKey: state.appToastMessageKey,
            appToastSeverity: state.appToastSeverity,
        })),
    );

    const isAppToast = Boolean(appToastMessage || appToastMessageKey);
    const isErrorToast = appToastSeverity === "error";
    const isWarningToast = appToastSeverity === "warning";
    const snackbarMessage = appToastMessageKey
        ? tCommon(appToastMessageKey)
        : appToastMessage
          ? appToastMessage
          : lastAddedTitle
            ? tCommon("toast.addedNamed", { name: lastAddedTitle })
            : tCommon("toast.added");
    const snackbarDuration = isAppToast ? 3500 : 1500;

    return (
        <Snackbar
            open={addToast !== 0}
            autoHideDuration={snackbarDuration}
            onClose={() => setAddToast(0)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
                position: "fixed",
                top: {
                    xs: "calc(64px + env(safe-area-inset-top))",
                    sm: 72,
                },
                right: 16,
                zIndex: 1400,
                pointerEvents: "none",
                maxWidth: 360,
            }}
            ContentProps={{
                sx: (theme) => ({
                    bgcolor: isErrorToast
                        ? alpha(theme.palette.error.main, 0.08)
                        : isWarningToast
                          ? alpha(theme.palette.warning.main, 0.08)
                          : "background.paper",
                    color: "text.primary",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: isErrorToast
                        ? alpha(theme.palette.error.main, 0.35)
                        : isWarningToast
                          ? alpha(theme.palette.warning.main, 0.35)
                          : alpha(theme.palette.divider, 0.9),
                    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                }),
            }}
            message={
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                    }}
                >
                    {isErrorToast ? (
                        <ErrorOutlineIcon
                            aria-hidden
                            focusable="false"
                            sx={{ color: "error.main", fontSize: 20 }}
                        />
                    ) : isWarningToast ? (
                        <WarningAmberRoundedIcon
                            aria-hidden
                            focusable="false"
                            sx={{ color: "warning.main", fontSize: 20 }}
                        />
                    ) : (
                        <CheckCircleOutlineIcon
                            aria-hidden
                            focusable="false"
                            sx={{
                                color: isAppToast
                                    ? "success.main"
                                    : "secondary.main",
                                fontSize: 20,
                            }}
                        />
                    )}
                    <Box
                        component="span"
                        sx={{
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {snackbarMessage}
                    </Box>
                </Box>
            }
        />
    );
}

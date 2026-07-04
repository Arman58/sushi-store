"use client";

import { useMediaQuery, useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useTranslations } from "next-intl";

type ProductFormDialogShellProps = {
    open: boolean;
    isEdit: boolean;
    onClose: () => void;
};

export function ProductFormDialogShell({
    open,
    isEdit,
    onClose,
}: ProductFormDialogShellProps) {
    const t = useTranslations("admin.products");
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            fullScreen={isMobile}
            maxWidth="md"
            sx={{
                "& .MuiDialog-container": {
                    alignItems: { xs: "stretch", md: "center" },
                },
                "& .MuiDialog-paper": {
                    display: "flex",
                    flexDirection: "column",
                    height: { xs: "100%", md: "auto" },
                    m: { xs: 0, md: 3 },
                    borderRadius: { xs: 0, md: 4 },
                },
            }}
        >
            <DialogTitle sx={{ flexShrink: 0 }}>
                {isEdit ? t("editProduct") : t("newProduct")}
            </DialogTitle>
            <DialogContent
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: { xs: 240, md: 280 },
                    py: 6,
                }}
            >
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <CircularProgress size={40} />
                </Box>
            </DialogContent>
        </Dialog>
    );
}

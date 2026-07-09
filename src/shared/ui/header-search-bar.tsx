"use client";

import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { tokens } from "./theme";

type HeaderSearchBarProps = {
    variant?: "desktop" | "mobile";
    onOpen: () => void;
};

export function HeaderSearchBar({
    variant = "desktop",
    onOpen,
}: HeaderSearchBarProps) {
    const t = useTranslations("nav");

    return (
        <Box
            sx={
                variant === "desktop"
                    ? {
                          display: { xs: "none", md: "flex" },
                          alignItems: "center",
                          flex: "1 1 auto",
                          minWidth: 200,
                          maxWidth: 480,
                          mx: 2,
                      }
                    : {
                          display: { xs: "flex", md: "none" },
                          alignItems: "center",
                          width: "100%",
                      }
            }
        >
            <ButtonBase
                onClick={onOpen}
                aria-label={t("search")}
                sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    width: "100%",
                    minHeight: 44,
                    gap: 1,
                    px: 2.25,
                    py: 0.75,
                    borderRadius: 999,
                    border: "1px solid transparent",
                    bgcolor: tokens.surfaceHi,
                    color: tokens.textMuted,
                    transition: "border-color 0.2s, background-color 0.2s",
                    "&:hover": { bgcolor: "action.hover" },
                }}
            >
                <SearchIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                <Typography
                    component="span"
                    noWrap
                    sx={{ fontSize: "0.875rem", color: "inherit" }}
                >
                    {t("searchPlaceholder")}
                </Typography>
            </ButtonBase>
        </Box>
    );
}

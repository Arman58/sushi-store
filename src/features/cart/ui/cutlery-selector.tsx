"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { useCartStore } from "@/features/cart/model/store";
import { triggerHaptic } from "@/shared/lib/haptic";
import { tokens } from "@/shared/ui/theme";

type CutlerySelectorProps = {
    compact?: boolean;
};

export function CutlerySelector({ compact = false }: CutlerySelectorProps) {
    const t = useTranslations("cart.cutlery");
    const personsCount = useCartStore((s) => s.personsCount);
    const setPersonsCount = useCartStore((s) => s.setPersonsCount);

    const handleDecrease = () => {
        if (personsCount > 1) {
            triggerHaptic();
            setPersonsCount(personsCount - 1);
        }
    };

    const handleIncrease = () => {
        if (personsCount < 10) {
            triggerHaptic();
            setPersonsCount(personsCount + 1);
        }
    };

    if (compact) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                    py: 1,
                    px: 1.25,
                    borderRadius: 2,
                    bgcolor: tokens.surfaceHi,
                    border: `1px solid ${tokens.border}`,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
                        🥢
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                                color: "text.primary",
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {t("title")}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexShrink: 0 }}>
                    <IconButton
                        size="small"
                        aria-label={t("decreaseAria")}
                        disabled={personsCount <= 1}
                        onClick={handleDecrease}
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            bgcolor: "background.paper",
                            border: `1px solid ${tokens.border}`,
                            p: 0,
                            "&:disabled": { opacity: 0.35 },
                        }}
                    >
                        <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>

                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                            minWidth: 20,
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {personsCount}
                    </Typography>

                    <IconButton
                        size="small"
                        aria-label={t("increaseAria")}
                        disabled={personsCount >= 10}
                        onClick={handleIncrease}
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            bgcolor: "background.paper",
                            border: `1px solid ${tokens.border}`,
                            p: 0,
                            "&:disabled": { opacity: 0.35 },
                        }}
                    >
                        <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Stack>
            </Stack>
        );
    }

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2.5,
                bgcolor: tokens.surfaceHi,
                borderColor: tokens.border,
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
            >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "background.paper",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            fontSize: 20,
                            flexShrink: 0,
                        }}
                    >
                        🥢
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            sx={{
                                color: "text.primary",
                                lineHeight: 1.25,
                            }}
                        >
                            {t("title")}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: "text.secondary",
                                display: "block",
                                mt: 0.25,
                                lineHeight: 1.3,
                            }}
                        >
                            {t("subtitle")}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                    <IconButton
                        size="small"
                        aria-label={t("decreaseAria")}
                        disabled={personsCount <= 1}
                        onClick={handleDecrease}
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            bgcolor: "background.paper",
                            border: `1px solid ${tokens.border}`,
                            color: "text.primary",
                            p: 0,
                            "&:hover": {
                                borderColor: tokens.brand,
                                color: tokens.brand,
                            },
                            "&:disabled": { opacity: 0.35 },
                        }}
                    >
                        <RemoveIcon sx={{ fontSize: 18 }} />
                    </IconButton>

                    <Typography
                        variant="body1"
                        fontWeight={800}
                        sx={{
                            minWidth: 24,
                            textAlign: "center",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {personsCount}
                    </Typography>

                    <IconButton
                        size="small"
                        aria-label={t("increaseAria")}
                        disabled={personsCount >= 10}
                        onClick={handleIncrease}
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            bgcolor: "background.paper",
                            border: `1px solid ${tokens.border}`,
                            color: "text.primary",
                            p: 0,
                            "&:hover": {
                                borderColor: tokens.brand,
                                color: tokens.brand,
                            },
                            "&:disabled": { opacity: 0.35 },
                        }}
                    >
                        <AddIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Stack>
            </Stack>
        </Paper>
    );
}

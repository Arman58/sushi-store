"use client";

import PhoneIcon from "@mui/icons-material/Phone";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import {
    buildTelegramSupportUrl,
    buildWhatsAppOrderUrl,
    CONTACT_PHONE,
    CONTACT_PHONE_DISPLAY,
} from "@/lib/site-config";

/** Иконка WhatsApp */
export function WhatsAppIcon(props: { size?: number }) {
    const size = props.size ?? 20;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12.031 2C6.516 2 2.031 6.484 2.031 12c0 1.954.563 3.774 1.531 5.313L2 22l4.828-1.531A9.957 9.957 0 0 0 12.031 22C17.547 22 22.031 17.516 22.031 12S17.547 2 12.031 2zm0 18.25c-1.609 0-3.14-.422-4.484-1.187l-.328-.188-2.859.906.922-2.781-.203-.344A8.197 8.197 0 0 1 3.781 12c0-4.547 3.703-8.25 8.25-8.25s8.25 3.703 8.25 8.25-3.703 8.25-8.25 8.25zm4.516-6.172c-.25-.125-1.469-.719-1.688-.813-.219-.078-.375-.125-.531.125s-.625.813-.766.969-.281.188-.531.063c-1.391-.688-2.313-1.234-3.234-2.813-.156-.266 0-.406.125-.531.109-.109.25-.281.375-.422s.156-.25.25-.406a.548.548 0 0 0 0-.531c-.063-.125-.531-1.281-.734-1.766-.188-.453-.391-.391-.531-.406h-.453c-.156 0-.406.063-.625.313-.219.234-.844.828-.844 2.016s.859 2.344.984 2.5c.125.156 1.688 2.578 4.094 3.609 1.547.672 2.141.734 2.906.625.469-.063 1.469-.609 1.672-1.203.203-.594.203-1.094.141-1.203-.063-.094-.219-.156-.469-.281z" />
        </svg>
    );
}

/** Иконка Telegram */
export function TelegramIcon(props: { size?: number }) {
    const size = props.size ?? 20;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
        </svg>
    );
}

type MessengerSupportButtonsProps = {
    orderId?: number | string;
    showPhone?: boolean;
    compact?: boolean;
};

export function MessengerSupportButtons({
    orderId,
    showPhone = false,
    compact = false,
}: MessengerSupportButtonsProps) {
    const tTracker = useTranslations("order.tracker");
    const theme = useTheme();

    const waUrl = buildWhatsAppOrderUrl(orderId);
    const tgUrl = buildTelegramSupportUrl();

    // Защита от разрыва номера на пробелах
    const formattedPhone = CONTACT_PHONE_DISPLAY.replace(/ /g, "\u00A0");

    return (
        <Stack spacing={1.5} sx={{ width: "100%" }}>
            {showPhone && (
                <Button
                    component="a"
                    href={`tel:${CONTACT_PHONE}`}
                    variant="contained"
                    fullWidth
                    sx={{
                        borderRadius: 3,
                        fontWeight: 800,
                        py: compact ? 1.2 : 1.5,
                        px: 2,
                        textTransform: "none",
                        boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.28)}`,
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                            boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                            transform: "translateY(-1px)",
                        },
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                        spacing={1}
                        sx={{ width: "100%", minWidth: 0 }}
                    >
                        <PhoneIcon sx={{ fontSize: compact ? 19 : 21, flexShrink: 0 }} />
                        <Typography
                            component="span"
                            sx={{
                                fontWeight: 800,
                                fontSize: compact ? "0.88rem" : "0.95rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                lineHeight: 1.2,
                            }}
                        >
                            {tTracker("callUs")} · {formattedPhone}
                        </Typography>
                    </Stack>
                </Button>
            )}

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 1.25,
                    width: "100%",
                }}
            >
                {/* WhatsApp Button */}
                <Button
                    component="a"
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    sx={{
                        width: "100%",
                        minWidth: 0,
                        borderRadius: 3,
                        p: compact ? 1.1 : 1.35,
                        borderColor: alpha("#25D366", 0.45),
                        color: theme.palette.mode === "dark" ? "#4ADE80" : "#0f766e",
                        bgcolor: alpha("#25D366", theme.palette.mode === "dark" ? 0.12 : 0.05),
                        textTransform: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 1.25,
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                            borderColor: "#25D366",
                            bgcolor: alpha("#25D366", theme.palette.mode === "dark" ? 0.22 : 0.12),
                            transform: "translateY(-1px)",
                            boxShadow: `0 4px 14px ${alpha("#25D366", 0.25)}`,
                        },
                    }}
                >
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                            width: compact ? 32 : 36,
                            height: compact ? 32 : 36,
                            borderRadius: 2,
                            bgcolor: alpha("#25D366", 0.18),
                            color: "#25D366",
                            flexShrink: 0,
                        }}
                    >
                        <WhatsAppIcon size={compact ? 18 : 20} />
                    </Stack>
                    <Box sx={{ textAlign: "left", flex: 1, minWidth: 0, overflow: "hidden" }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
                                WhatsApp
                            </Typography>
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: "#25D366",
                                    boxShadow: "0 0 6px #25D366",
                                    flexShrink: 0,
                                }}
                            />
                        </Stack>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block", fontSize: "0.72rem", lineHeight: 1.1, mt: 0.2 }}
                        >
                            {tTracker("whatsappSub")}
                        </Typography>
                    </Box>
                </Button>

                {/* Telegram Button */}
                <Button
                    component="a"
                    href={tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    sx={{
                        width: "100%",
                        minWidth: 0,
                        borderRadius: 3,
                        p: compact ? 1.1 : 1.35,
                        borderColor: alpha("#0088cc", 0.45),
                        color: theme.palette.mode === "dark" ? "#38BDF8" : "#0088cc",
                        bgcolor: alpha("#0088cc", theme.palette.mode === "dark" ? 0.12 : 0.05),
                        textTransform: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 1.25,
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                            borderColor: "#0088cc",
                            bgcolor: alpha("#0088cc", theme.palette.mode === "dark" ? 0.22 : 0.12),
                            transform: "translateY(-1px)",
                            boxShadow: `0 4px 14px ${alpha("#0088cc", 0.25)}`,
                        },
                    }}
                >
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                            width: compact ? 32 : 36,
                            height: compact ? 32 : 36,
                            borderRadius: 2,
                            bgcolor: alpha("#0088cc", 0.18),
                            color: "#0088cc",
                            flexShrink: 0,
                        }}
                    >
                        <TelegramIcon size={compact ? 18 : 20} />
                    </Stack>
                    <Box sx={{ textAlign: "left", flex: 1, minWidth: 0, overflow: "hidden" }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
                                Telegram
                            </Typography>
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: "#0088cc",
                                    boxShadow: "0 0 6px #0088cc",
                                    flexShrink: 0,
                                }}
                            />
                        </Stack>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block", fontSize: "0.72rem", lineHeight: 1.1, mt: 0.2 }}
                        >
                            {tTracker("telegramSub")}
                        </Typography>
                    </Box>
                </Button>
            </Box>
        </Stack>
    );
}

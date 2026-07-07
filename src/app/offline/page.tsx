"use client";

import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import WifiOffOutlinedIcon from "@mui/icons-material/WifiOffOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Inline translations — next-intl не доступен offline, определяем вручную
const translations: Record<
    string,
    { title: string; subtitle: string; retry: string; menu: string }
> = {
    ru: {
        title: "Нет подключения к сети",
        subtitle:
            "Но наше меню всё ещё доступно — оно сохранено на вашем устройстве!",
        retry: "Попробовать снова",
        menu: "Открыть меню",
    },
    en: {
        title: "No internet connection",
        subtitle:
            "But our menu is still available — it\u2019s saved on your device!",
        retry: "Try again",
        menu: "Open menu",
    },
    hy: {
        title: "\u053b\u0576\u057f\u0565\u0580\u0576\u0565\u057f \u056f\u0561\u057a \u0579\u056f\u0561",
        subtitle:
            "\u0532\u0561\u0575\u0581 \u0574\u0565\u0580 \u0574\u0565\u0576\u0575\u0578\u0582\u0576 \u0570\u0561\u057d\u0561\u0576\u0565\u056c\u056b \u0567 \u2014 \u0561\u0575\u0576 \u057a\u0561\u0570\u057e\u0561\u056e \u0567 \u0571\u0565\u0580 \u057d\u0561\u0580\u0584\u0578\u0582\u0574:",
        retry: "\u0553\u0578\u0580\u0571\u0565\u056c \u056f\u0580\u056f\u056b\u0576",
        menu: "\u0532\u0561\u0581\u0565\u056c \u0574\u0565\u0576\u0575\u0578\u0582\u0576",
    },
};

function detectLocale(): string {
    if (typeof window === "undefined") return "ru";
    // Check URL path first: /ru/..., /en/..., /hy/...
    const pathLang = window.location.pathname.split("/")[1];
    if (pathLang && translations[pathLang]) return pathLang;
    // Fall back to navigator language
    const navLang = navigator.language?.slice(0, 2);
    if (navLang && translations[navLang]) return navLang;
    return "ru";
}

export default function OfflinePage() {
    const locale = detectLocale();

    const t = translations[locale] ?? translations.ru;

    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 6,
                bgcolor: "background.default",
            }}
        >
            <Stack
                alignItems="center"
                spacing={3}
                maxWidth={420}
                textAlign="center"
            >
                {/* Animated WiFi icon */}
                <Box
                    sx={{
                        width: 96,
                        height: 96,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(39, 174, 96, 0.08)",
                        animation: "pulseOffline 2.5s ease-in-out infinite",
                        "@keyframes pulseOffline": {
                            "0%, 100%": {
                                transform: "scale(1)",
                                boxShadow:
                                    "0 0 0 0 rgba(39, 174, 96, 0.15)",
                            },
                            "50%": {
                                transform: "scale(1.06)",
                                boxShadow:
                                    "0 0 0 16px rgba(39, 174, 96, 0)",
                            },
                        },
                    }}
                >
                    <WifiOffOutlinedIcon
                        sx={{ fontSize: 48, color: "text.disabled" }}
                    />
                </Box>

                <Typography variant="h5" component="h1" fontWeight={800}>
                    {t.title}
                </Typography>

                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 320 }}
                >
                    {t.subtitle}
                </Typography>

                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outlined"
                        size="large"
                        startIcon={<RefreshOutlinedIcon />}
                        sx={{
                            borderRadius: 999,
                            px: 3,
                            textTransform: "none",
                            fontWeight: 700,
                        }}
                    >
                        {t.retry}
                    </Button>
                    <Button
                        component="a"
                        href="/menu"
                        variant="contained"
                        size="large"
                        startIcon={<MenuBookOutlinedIcon />}
                        sx={{
                            borderRadius: 999,
                            px: 3,
                            textTransform: "none",
                            fontWeight: 700,
                        }}
                    >
                        {t.menu}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}

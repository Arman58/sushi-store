import { createTheme, alpha } from "@mui/material/styles";

// ─── Design tokens ────────────────────────────────────────────────────────────

export const tokens = {
    // Surfaces — true dark layered system
    bg:         "#0B0B0B",
    surface:    "#141414",
    surfaceUp:  "#1C1C1C",
    surfaceHi:  "#242424",
    border:     "rgba(255,255,255,0.07)",
    borderHi:   "rgba(255,255,255,0.12)",

    // Brand accent
    orange:     "#FF6B00",
    orangeHi:   "#FF8C33",
    orangeDim:  "rgba(255,107,0,0.12)",
    orangeGlow: "rgba(255,107,0,0.25)",

    // Danger / promo
    red:        "#E53935",
    redDim:     "rgba(229,57,53,0.12)",

    // Success
    green:      "#22C55E",
    greenDim:   "rgba(34,197,94,0.12)",

    // Text scale
    textPrimary:   "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.55)",
    textMuted:     "rgba(255,255,255,0.30)",

    // Spacing (multiples of 4)
    s1: 4,
    s2: 8,
    s3: 12,
    s4: 16,
    s6: 24,
    s8: 32,
    s12: 48,
    s16: 64,
} as const;

// ─── Theme ────────────────────────────────────────────────────────────────────

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: tokens.orange,
            light: tokens.orangeHi,
            dark: "#CC5500",
            contrastText: "#FFFFFF",
        },
        secondary: {
            main: tokens.red,
            contrastText: "#FFFFFF",
        },
        error: {
            main: tokens.red,
        },
        success: {
            main: tokens.green,
        },
        warning: {
            main: tokens.orange,
        },
        background: {
            default: tokens.bg,
            paper: tokens.surface,
        },
        text: {
            primary: tokens.textPrimary,
            secondary: tokens.textSecondary,
            disabled: tokens.textMuted,
        },
        divider: tokens.border,
        action: {
            hover: "rgba(255,255,255,0.05)",
            selected: tokens.orangeDim,
            focus: tokens.orangeDim,
        },
    },

    typography: {
        fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        // Scale: tight letterSpacing on large, loose on small
        h1: { fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.05 },
        h2: { fontWeight: 800, letterSpacing: -1,   lineHeight: 1.1  },
        h3: { fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15 },
        h4: { fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2  },
        h5: { fontWeight: 700, letterSpacing: -0.2                   },
        h6: { fontWeight: 600                                         },
        subtitle1: { fontWeight: 600, letterSpacing: 0.1             },
        subtitle2: { fontWeight: 600, letterSpacing: 0.05            },
        body1:     { lineHeight: 1.6                                  },
        body2:     { lineHeight: 1.5                                  },
        caption:   { letterSpacing: 0.3                               },
        button: {
            textTransform: "none",
            fontWeight: 700,
            letterSpacing: 0.2,
        },
        overline: {
            textTransform: "uppercase",
            letterSpacing: 1.5,
            fontWeight: 700,
            fontSize: "0.65rem",
        },
    },

    shape: { borderRadius: 12 },

    // ── Component overrides ──────────────────────────────────────────────────

    components: {
        // ── CssBaseline ──
        MuiCssBaseline: {
            styleOverrides: {
                "*, *::before, *::after": { boxSizing: "border-box" },
                html: { scrollBehavior: "smooth" },
                body: {
                    backgroundColor: tokens.bg,
                    color: tokens.textPrimary,
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                },
                // Custom scrollbar
                "::-webkit-scrollbar": { width: 6 },
                "::-webkit-scrollbar-track": { background: tokens.bg },
                "::-webkit-scrollbar-thumb": {
                    background: tokens.surfaceHi,
                    borderRadius: 999,
                },
                "::-webkit-scrollbar-thumb:hover": { background: tokens.border },
            },
        },

        // ── Button ──
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    paddingInline: 20,
                    paddingBlock: 11,
                    fontSize: "0.875rem",
                    transition: "all 0.18s ease",
                    "&:active": { transform: "scale(0.97)" },
                },
                contained: {
                    background: `linear-gradient(135deg, ${tokens.orange} 0%, ${tokens.orangeHi} 100%)`,
                    boxShadow: `0 8px 24px ${tokens.orangeGlow}`,
                    "&:hover": {
                        boxShadow: `0 12px 32px ${tokens.orangeGlow}`,
                        background: `linear-gradient(135deg, ${tokens.orangeHi} 0%, #FFAA66 100%)`,
                    },
                },
                outlined: {
                    borderColor: tokens.border,
                    color: tokens.textPrimary,
                    "&:hover": {
                        borderColor: tokens.borderHi,
                        backgroundColor: tokens.surfaceUp,
                    },
                },
                sizeLarge: {
                    paddingInline: 28,
                    paddingBlock: 14,
                    fontSize: "1rem",
                },
                sizeSmall: {
                    paddingInline: 14,
                    paddingBlock: 7,
                    fontSize: "0.8rem",
                },
            },
        },

        // ── IconButton ──
        MuiIconButton: {
            styleOverrides: {
                root: {
                    transition: "all 0.18s ease",
                    "&:active": { transform: "scale(0.92)" },
                },
            },
        },

        // ── Paper ──
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",     // kill MUI dark mode gradient
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                },
                elevation0: { boxShadow: "none" },
                elevation1: { boxShadow: "0 4px 16px rgba(0,0,0,0.4)" },
                elevation2: { boxShadow: "0 8px 24px rgba(0,0,0,0.5)" },
                elevation3: { boxShadow: "0 16px 40px rgba(0,0,0,0.6)" },
            },
        },

        // ── Card ──
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    backgroundImage: "none",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                    "&:hover": {
                        borderColor: tokens.borderHi,
                        transform: "translateY(-2px)",
                        boxShadow: "0 20px 48px rgba(0,0,0,0.6)",
                    },
                },
            },
        },

        // ── TextField ──
        MuiTextField: {
            defaultProps: { variant: "outlined" },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.surfaceUp,
                    borderRadius: 10,
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: tokens.border,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: tokens.borderHi,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: tokens.orange,
                        borderWidth: 1,
                    },
                },
                input: { color: tokens.textPrimary },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: tokens.textSecondary,
                    "&.Mui-focused": { color: tokens.orange },
                },
            },
        },

        // ── Chip ──
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                },
                filled: {
                    backgroundColor: tokens.surfaceHi,
                    color: tokens.textPrimary,
                },
                outlined: {
                    borderColor: tokens.border,
                    color: tokens.textSecondary,
                },
            },
        },

        // ── Drawer ──
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: tokens.surface,
                    backgroundImage: "none",
                    borderLeft: `1px solid ${tokens.border}`,
                },
            },
        },

        // ── Divider ──
        MuiDivider: {
            styleOverrides: {
                root: { borderColor: tokens.border },
            },
        },

        // ── Tabs ──
        MuiTab: {
            styleOverrides: {
                root: {
                    color: tokens.textSecondary,
                    fontWeight: 600,
                    textTransform: "none",
                    minHeight: 40,
                    "&.Mui-selected": { color: tokens.orange },
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: { backgroundColor: tokens.orange, height: 2, borderRadius: 999 },
            },
        },

        // ── Alert ──
        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: 10 },
                standardError: {
                    backgroundColor: tokens.redDim,
                    border: `1px solid ${tokens.red}33`,
                    color: "#FF8A87",
                },
                standardWarning: {
                    backgroundColor: tokens.orangeDim,
                    border: `1px solid ${tokens.orange}33`,
                    color: tokens.orangeHi,
                },
                standardSuccess: {
                    backgroundColor: tokens.greenDim,
                    border: `1px solid ${tokens.green}33`,
                    color: tokens.green,
                },
            },
        },

        // ── Snackbar ──
        MuiSnackbar: {
            styleOverrides: {
                root: { bottom: 80 }, // above mobile nav
            },
        },

        // ── AppBar ──
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    backgroundColor: `${tokens.bg}F0`,
                    backdropFilter: "blur(20px)",
                    borderBottom: `1px solid ${tokens.border}`,
                    boxShadow: "none",
                },
            },
        },

        // ── BottomNavigation ──
        MuiBottomNavigation: {
            styleOverrides: {
                root: { backgroundColor: tokens.surface },
            },
        },
        MuiBottomNavigationAction: {
            styleOverrides: {
                root: {
                    color: tokens.textMuted,
                    "&.Mui-selected": { color: tokens.orange },
                    minWidth: 0,
                },
            },
        },

        // ── Radio ──
        MuiRadio: {
            styleOverrides: {
                root: {
                    color: tokens.textMuted,
                    "&.Mui-checked": { color: tokens.orange },
                },
            },
        },

        // ── FormControlLabel ──
        MuiFormControlLabel: {
            styleOverrides: {
                label: { color: tokens.textSecondary },
            },
        },

        // ── Badge ──
        MuiBadge: {
            styleOverrides: {
                badge: {
                    backgroundColor: tokens.orange,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 10,
                    minWidth: 18,
                    height: 18,
                    padding: "0 4px",
                },
            },
        },

        // ── Skeleton ──
        MuiSkeleton: {
            styleOverrides: {
                root: { backgroundColor: tokens.surfaceUp },
                wave: {
                    "&::after": {
                        background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
                    },
                },
            },
        },
    },
});

export default theme;

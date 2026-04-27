import { createTheme, alpha } from "@mui/material/styles";

// ─── Design tokens ────────────────────────────────────────────────────────────

export const tokens = {
    // Surfaces — light layered system
    bg:         "#FAFAF5",
    surface:    "#FFFFFF",
    surfaceUp:  "#FFFFFF",
    surfaceHi:  "#F5F5F0",
    border:     "#f0f0f0",
    borderHi:   "#e0e0e0",

    // Brand accent (primary)
    orange:     "#E85D4A",
    orangeHi:   "#ED7565",
    orangeDim:  "rgba(232,93,74,0.12)",
    orangeGlow: "rgba(232,93,74,0.18)",

    // Danger / promo
    red:        "#E53935",
    redDim:     "rgba(229,57,53,0.12)",

    // Success
    green:      "#22C55E",
    greenDim:   "rgba(34,197,94,0.12)",

    // Text scale
    textPrimary:   "#1a1a1a",
    textSecondary: "rgba(26,26,26,0.62)",
    textMuted:     "rgba(26,26,26,0.42)",

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

/** Premium gradient shimmer for MUI `<Skeleton />`. Requires `@keyframes shimmer` in global CSS (e.g. `background-position` sweep). */
export const skeletonShimmerSx = {
    background:
        "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
} as const;

const primaryMain = tokens.orange;
const secondaryMain = "#2DB5A0";

// ─── Theme ────────────────────────────────────────────────────────────────────

const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: primaryMain,
            light: tokens.orangeHi,
            dark: "#C94A3A",
            contrastText: "#FFFFFF",
        },
        secondary: {
            main: secondaryMain,
            light: "#5CC9B8",
            dark: "#249080",
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
            default: "#FAFAF5",
            paper: "#FFFFFF",
        },
        text: {
            primary: tokens.textPrimary,
            secondary: tokens.textSecondary,
            disabled: tokens.textMuted,
        },
        divider: tokens.border,
        action: {
            hover: "rgba(26,26,26,0.04)",
            selected: tokens.orangeDim,
            focus: alpha(primaryMain, 0.12),
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
                    background: tokens.borderHi,
                    borderRadius: 999,
                },
                "::-webkit-scrollbar-thumb:hover": { background: alpha(tokens.textPrimary, 0.25) },
            },
        },

        // ── Button ──
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    paddingInline: 20,
                    paddingBlock: 11,
                    fontSize: "0.875rem",
                    transition: "all 0.18s ease",
                    "&:active": { transform: "scale(0.97)" },
                },
                contained: {
                    background: primaryMain,
                    boxShadow: "none",
                    "&:hover": {
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        background: tokens.orangeHi,
                    },
                },
                outlined: {
                    borderColor: tokens.border,
                    color: tokens.textPrimary,
                    "&:hover": {
                        borderColor: tokens.borderHi,
                        backgroundColor: tokens.surfaceHi,
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
                    backgroundImage: "none",
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                },
                elevation0: { boxShadow: "none" },
                elevation1: { boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
                elevation2: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
                elevation3: { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
            },
        },

        // ── Card ──
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    backgroundImage: "none",
                    boxShadow: "none",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                    "&:hover": {
                        borderColor: tokens.borderHi,
                        transform: "translateY(-1px)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
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
                    backgroundColor: tokens.surfaceHi,
                    borderRadius: 12,
                    "& fieldset": {
                        borderColor: tokens.border,
                    },
                    "&:hover:not(.Mui-disabled) fieldset": {
                        borderColor: "#bdbdbd",
                    },
                    "&.Mui-focused fieldset": {
                        borderColor: "#757575 !important",
                        borderWidth: 2,
                    },
                },
                input: { color: tokens.textPrimary },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: tokens.textSecondary,
                    "&.Mui-focused": { color: "#757575" },
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
                root: { borderRadius: 12 },
                standardError: {
                    backgroundColor: tokens.redDim,
                    border: `1px solid ${alpha(tokens.red, 0.2)}`,
                    color: "#B71C1C",
                },
                standardWarning: {
                    backgroundColor: tokens.orangeDim,
                    border: `1px solid ${alpha(primaryMain, 0.25)}`,
                    color: "#C94A3A",
                },
                standardSuccess: {
                    backgroundColor: tokens.greenDim,
                    border: `1px solid ${alpha(tokens.green, 0.25)}`,
                    color: "#1B5E20",
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
                    backgroundColor: alpha(tokens.bg, 0.85),
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderBottom: "1px solid #f0f0f0",
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
                root: { backgroundColor: tokens.surfaceHi },
                wave: {
                    "&::after": {
                        background:
                            "linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent)",
                    },
                },
            },
        },
    },
});

export default theme;

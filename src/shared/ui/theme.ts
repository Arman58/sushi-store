import { alpha,createTheme } from "@mui/material/styles";

// ─── Design tokens (food delivery - синхронизируй palette.primary с tokens.brand) ─

/**
 * Нейтральные цвета - CSS-переменные: значения задаются в MuiCssBaseline
 * для :root / [data-theme="light"] и [data-theme="dark"]. Компонентные overrides
 * используют tokens.* и автоматически поддерживают тёмную тему.
 * palette.text/background в colorSchemes - hex (MUI alpha() не понимает var()).
 * Бренд/красный - константы (не зависят от темы, безопасны для alpha()).
 */
export const tokens = {
    // Surfaces
    bg:         "var(--ew-bg)",
    surface:    "var(--ew-surface)",
    surfaceUp:  "var(--ew-surface)",
    surfaceHi:  "var(--ew-surface-hi)",
    border:     "var(--ew-border)",
    borderHi:   "var(--ew-border-hi)",

    // Brand - зелёный как на референсе #27AE60
    brand:      "#27AE60",
    brandHi:    "#2ECC71",
    brandDim:   "rgba(39, 174, 96, 0.10)",
    brandGlow:  "rgba(39, 174, 96, 0.25)",

    // Promo / ошибки
    red:        "#E74C3C",
    redDim:     "rgba(231,76,60,0.12)",

    // Success
    green:      "#27AE60",
    greenDim:   "rgba(39,174,96,0.12)",

    // Text scale
    textPrimary:   "var(--ew-text)",
    textSecondary: "var(--ew-text-2)",
    textMuted:     "var(--ew-text-3)",

    /** Радиус мелких контролов (инпуты, чипы) - задаётся в overrides, не через shape */
    radiusInput: 10,
    radiusCardLg: 14,

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

const primaryMain = tokens.brand;

/** Secondary: тёплая бирюза как контрапт к аппетитному primary - CTA/snackbar вторичный */
const secondaryMain = "#1BA89A";

const focusVisibleRing = {
    "&:focus-visible": {
        outline: "none",
        boxShadow:
            `0 0 0 2px ${tokens.surface}, 0 0 0 4px ${alpha(primaryMain, 0.45)}`,
    },
} as const;

/** Мягкая тень для карточек продукта / Paper - без жёсткого «дефолтного MUI». */
const cardElevationShadow =
    `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)`;

/** Общие цвета палитры (не зависят от темы). */
const sharedPalette = {
    primary: {
        main: primaryMain,
        light: tokens.brandHi,
        dark: "#1E8449",
        contrastText: "#FFFFFF",
    },
    secondary: {
        main: secondaryMain,
        light: "#43C9BC",
        dark: "#138A7F",
        contrastText: "#FFFFFF",
    },
    error: {
        main: tokens.red,
    },
    success: {
        main: tokens.green,
    },
    warning: {
        main: "#F59E0B",
    },
} as const;

/**
 * MUI вызывает alpha() на palette.text/background — только hex/rgb, не var().
 * Схемы синхронизированы с --ew-* в MuiCssBaseline и data-theme на <html>.
 */
const lightPalette = {
    ...sharedPalette,
    mode: "light" as const,
    background: {
        default: "#FFFFFF",
        paper: "#FFFFFF",
    },
    text: {
        primary: "#000000",
        secondary: "#333333",
        disabled: "#666666",
    },
    divider: "#EAEAEA",
    action: {
        hover: "rgba(0, 0, 0, 0.045)",
        selected: tokens.brandDim,
        focus: alpha(primaryMain, 0.12),
    },
};

const darkPalette = {
    ...sharedPalette,
    mode: "dark" as const,
    background: {
        default: "#0F1214",
        paper: "#16191C",
    },
    text: {
        primary: "#F2F4F5",
        secondary: "#C3C9CD",
        disabled: "#8A9299",
    },
    divider: "#2A2F34",
    action: {
        hover: "rgba(242, 244, 245, 0.045)",
        selected: tokens.brandDim,
        focus: alpha(primaryMain, 0.12),
    },
};

const theme = createTheme({
    cssVariables: {
        colorSchemeSelector: '[data-theme="%s"]',
    },
    colorSchemes: {
        light: { palette: lightPalette },
        dark: { palette: darkPalette },
    },

    typography: {
        fontFamily:
            "var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        // Заголовки секций retail / главная лента
        h1: {
            fontWeight: 900,
            letterSpacing: -1.4,
            lineHeight: 1.05,
            fontSize: "2rem",
            "@media (min-width:600px)": { fontSize: "2.5rem" },
        },
        h2: {
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.1,
            fontSize: "1.75rem",
        },
        h3: {
            fontWeight: 800,
            letterSpacing: -0.55,
            lineHeight: 1.15,
            fontSize: "1.45rem",
        },
        /** Секционные заголовки (лента «Популярное», блоки страницы) */
        h4: {
            fontWeight: 800,
            letterSpacing: -0.42,
            lineHeight: 1.2,
            fontSize: "1.3125rem", // 21px
            "@media (min-width:600px)": { fontSize: "1.4375rem" }, // 23px
        },
        /** Подзаголовки блоков при необходимости */
        h5: {
            fontWeight: 700,
            letterSpacing: -0.35,
            lineHeight: 1.25,
            fontSize: "1.1875rem", // 19px
            "@media (min-width:600px)": { fontSize: "1.3125rem" },
        },
        /** Заголовки диалогов, шапки drawer, карточки форм */
        h6: {
            fontWeight: 700,
            letterSpacing: -0.2,
            lineHeight: 1.3,
            fontSize: "1.0625rem", // 17px
        },
        subtitle1: { fontWeight: 650, letterSpacing: 0.015, fontSize: "1rem", lineHeight: 1.4 },
        subtitle2: { fontWeight: 650, letterSpacing: 0.03, fontSize: "0.875rem", lineHeight: 1.4 },
        body1:     { fontSize: "1rem", lineHeight: 1.65, letterSpacing: 0.01 },
        body2:     { fontSize: "0.875rem", lineHeight: 1.55 },
        caption:   {
            letterSpacing: 0.02,
            fontSize: "0.75rem",
            lineHeight: 1.45,
            color: tokens.textSecondary,
        },
        button: {
            textTransform: "none",
            fontWeight: 700,
            letterSpacing: 0.02,
        },
        overline: {
            textTransform: "uppercase",
            letterSpacing: 1.2,
            fontWeight: 700,
            fontSize: "0.65rem",
            lineHeight: 1.4,
            color: tokens.textSecondary,
        },
    },

    shape: { borderRadius: tokens.radiusCardLg },

    components: {
        MuiCssBaseline: {
            styleOverrides: {
                // Светлая схема (default) и тёмная через data-атрибут на <html>
                ":root, [data-theme=\"light\"]": {
                    "--ew-bg": "#FFFFFF",
                    "--ew-surface": "#FFFFFF",
                    "--ew-surface-hi": "#F5F5F5",
                    "--ew-border": "#EAEAEA",
                    "--ew-border-hi": "#D5D5D5",
                    "--ew-text": "#000000",
                    "--ew-text-2": "#333333",
                    "--ew-text-3": "#666666",
                    "--ew-text-rgb": "0, 0, 0",
                    "--ew-surface-rgb": "255, 255, 255",
                    colorScheme: "light",
                },
                '[data-theme="dark"]': {
                    "--ew-bg": "#0F1214",
                    "--ew-surface": "#16191C",
                    "--ew-surface-hi": "#22272B",
                    "--ew-border": "#2A2F34",
                    "--ew-border-hi": "#3A4046",
                    "--ew-text": "#F2F4F5",
                    "--ew-text-2": "#C3C9CD",
                    "--ew-text-3": "#8A9299",
                    "--ew-text-rgb": "242, 244, 245",
                    "--ew-surface-rgb": "22, 25, 28",
                    colorScheme: "dark",
                },
                "*, *::before, *::after": { boxSizing: "border-box" },
                body: {
                    backgroundColor: tokens.bg,
                    color: tokens.textPrimary,
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                },
                "#main-content": {
                    overflow: "visible",
                    maxWidth: "100%",
                },
                "::-webkit-scrollbar": { width: 6 },
                "::-webkit-scrollbar-track": { background: tokens.bg },
                "::-webkit-scrollbar-thumb": {
                    background: tokens.borderHi,
                    borderRadius: 999,
                },
                "::-webkit-scrollbar-thumb:hover": {
                    background: "rgba(var(--ew-text-rgb), 0.28)",
                },
            },
        },

        MuiButtonBase: {
            styleOverrides: { root: focusVisibleRing },
        },

        MuiTypography: {
            defaultProps: {
                noWrap: false,
            },
        },

        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    flexShrink: 0,
                    borderRadius: tokens.radiusCardLg,
                    paddingInline: 22,
                    paddingBlock: 12,
                    fontSize: "0.875rem",
                    transition:
                        "transform 0.18s ease, box-shadow 0.2s ease, background-color 0.18s ease, color 0.18s ease",
                    "&:active": { transform: "scale(0.975)" },
                },
                contained: {
                    "&:focus-visible": focusVisibleRing["&:focus-visible"],
                },
                containedPrimary: {
                    boxShadow: `0 4px 16px ${alpha(primaryMain, 0.32)}`,
                    "&:hover": {
                        boxShadow: `0 6px 22px ${alpha(primaryMain, 0.42)}`,
                        transform: "translateY(-1px)",
                        background: tokens.brandHi,
                    },
                    "&:active": { transform: "scale(0.975)" },
                    "&.Mui-disabled": {
                        boxShadow: "none",
                        opacity: 0.72,
                    },
                },
                outlined: {
                    borderColor: tokens.border,
                    borderWidth: 1,
                    color: tokens.textPrimary,
                    "&:hover": {
                        borderColor: tokens.borderHi,
                        backgroundColor: "rgba(var(--ew-text-rgb), 0.03)",
                    },
                },
                text: {
                    borderRadius: 10,
                    "&:hover": { backgroundColor: alpha(primaryMain, 0.06) },
                },
                sizeLarge: {
                    paddingInline: 28,
                    paddingBlock: 15,
                    fontSize: "1rem",
                    borderRadius: 14,
                },
                sizeSmall: {
                    paddingInline: 14,
                    paddingBlock: 10,
                    minHeight: 44,
                    fontSize: "0.8125rem",
                    borderRadius: tokens.radiusInput,
                },
            },
        },

        MuiSvgIcon: {
            defaultProps: {
                "aria-hidden": true,
                focusable: "false",
            },
            styleOverrides: {
                root: {
                    flexShrink: 0,
                },
            },
        },

        MuiIconButton: {
            defaultProps: {
                // WCAG / Apple HIG: минимальная зона нажатия 44×44 px
                size: "medium",
            },
            styleOverrides: {
                root: {
                    flexShrink: 0,
                    minWidth: 44,
                    minHeight: 44,
                    transition: "background-color 0.18s ease, transform 0.15s ease",
                    "&:active": { transform: "scale(0.93)" },
                },
                sizeSmall: {
                    minWidth: 44,
                    minHeight: 44,
                },
            },
        },

        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    backgroundColor: tokens.surface,
                    border: `1px solid ${"rgba(var(--ew-text-rgb), 0.065)"}`,
                },
                elevation0: {
                    boxShadow: "none",
                    borderColor: "rgba(var(--ew-text-rgb), 0.065)",
                },
                elevation1: { boxShadow: cardElevationShadow, borderColor: "transparent" },
                elevation2: {
                    boxShadow:
                        `0 2px 8px ${"rgba(var(--ew-text-rgb), 0.06)"}, 0 12px 24px ${"rgba(var(--ew-text-rgb), 0.08)"}`,
                    borderColor: "transparent",
                },
                elevation3: {
                    boxShadow:
                        `0 8px 30px ${"rgba(var(--ew-text-rgb), 0.1)"}, 0 2px 8px ${"rgba(var(--ew-text-rgb), 0.04)"}`,
                    borderColor: "transparent",
                },
            },
        },

        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.surface,
                    backgroundImage: "none",
                    border: `1px solid ${tokens.border}`,
                    borderRadius: tokens.radiusCardLg,
                    boxShadow: cardElevationShadow,
                    overflow: "hidden",
                    transition:
                        "box-shadow 0.22s ease, border-color 0.22s ease",
                    "&:hover": {
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    },
                },
            },
        },

        MuiTextField: {
            defaultProps: {
                variant: "outlined",
                size: "medium",
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    fontSize: "1rem",
                    borderRadius: tokens.radiusInput,
                    backgroundColor: tokens.surface,
                    transition: "box-shadow 0.18s ease, border-color 0.18s ease",
                    // MUI 7 рисует рамку через .MuiOutlinedInput-notchedOutline (fieldset)
                    "& .MuiOutlinedInput-notchedOutline, & fieldset": {
                        borderColor: tokens.border,
                        transition: "border-color 0.18s ease, border-width 0.18s ease",
                    },
                    "&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline, &:hover:not(.Mui-disabled):not(.Mui-error) fieldset":
                        {
                            borderColor: alpha(primaryMain, 0.35),
                        },
                    "&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline, &.Mui-focused:not(.Mui-error) fieldset":
                        {
                            borderWidth: "1.5px",
                            borderColor: `${primaryMain} !important`,
                        },
                    "&.Mui-error:not(.Mui-focused) .MuiOutlinedInput-notchedOutline, &.Mui-error:not(.Mui-focused) fieldset":
                        {
                            borderColor: `${tokens.red} !important`,
                        },
                    "&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline, &.Mui-error.Mui-focused fieldset":
                        {
                            borderWidth: "1.5px",
                            borderColor: `${tokens.red} !important`,
                        },
                    "&:focus-within:not(.Mui-disabled):not(.Mui-error)": {
                        boxShadow: `0 0 0 3px ${tokens.brandDim}, 0 4px 20px ${alpha(primaryMain, 0.1)}`,
                    },
                    "&.Mui-focused:not(.Mui-disabled):not(.Mui-error)": {
                        boxShadow: `0 0 0 3px ${tokens.brandDim}, 0 4px 20px ${alpha(primaryMain, 0.1)}`,
                    },
                    "&.Mui-focused.Mui-error": {
                        boxShadow: `0 0 0 3px ${tokens.redDim}`,
                    },
                },
                input: {
                    color: tokens.textPrimary,
                    // iOS не зумит страницу при фокусе, если font-size ≥ 16px
                    fontSize: "1rem",
                    "&::placeholder": {
                        color: tokens.textMuted,
                        opacity: 1,
                    },
                },
                inputMultiline: {
                    fontSize: "1rem",
                },
                notchedOutline: {
                    borderRadius: tokens.radiusInput,
                    borderColor: tokens.border,
                },
            },
        },
        MuiFormLabel: {
            styleOverrides: {
                asterisk: {
                    color: tokens.textMuted,
                    ".Mui-error &": { color: tokens.red },
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: tokens.textSecondary,
                    fontWeight: 500,
                    "&.Mui-focused:not(.Mui-error)": {
                        color: `${primaryMain} !important`,
                    },
                    "&.Mui-focused.Mui-error": {
                        color: `${tokens.red} !important`,
                    },
                    "&.MuiInputLabel-shrink": {
                        fontWeight: 650,
                        color: tokens.textMuted,
                    },
                    "&.Mui-error:not(.Mui-focused)": {
                        color: `${tokens.red} !important`,
                    },
                },
                outlined: { "&.MuiInputLabel-sizeSmall": { fontSize: "0.8125rem" } },
            },
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: { marginLeft: 2, letterSpacing: 0.015 },
            },
        },

        MuiChip: {
            styleOverrides: {
                root: {
                    flexShrink: 0,
                    borderRadius: tokens.radiusInput,
                    fontWeight: 650,
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

        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: tokens.surface,
                    backgroundImage: "none",
                    borderLeft: `1px solid ${tokens.border}`,
                },
            },
        },

        MuiDivider: {
            styleOverrides: { root: { borderColor: tokens.border } },
        },

        MuiTab: {
            styleOverrides: {
                root: {
                    color: tokens.textSecondary,
                    fontWeight: 650,
                    textTransform: "none",
                    minHeight: 44,
                    fontSize: "0.9375rem",
                    "&.Mui-selected": { color: tokens.brand },
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: {
                    backgroundColor: tokens.brand,
                    height: 3,
                    borderRadius: 999,
                },
            },
        },

        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: tokens.radiusCardLg },
                standardError: {
                    backgroundColor: tokens.redDim,
                    border: `1px solid ${alpha(tokens.red, 0.2)}`,
                    color: "#B71C1C",
                },
                standardWarning: {
                    backgroundColor: tokens.brandDim,
                    border: `1px solid ${alpha(primaryMain, 0.25)}`,
                    color: "#0B6630",
                },
                standardSuccess: {
                    backgroundColor: tokens.greenDim,
                    border: `1px solid ${alpha(tokens.green, 0.22)}`,
                    color: "#0D5940",
                },
            },
        },

        MuiSnackbar: {
            styleOverrides: {
                root: {
                    "&.MuiSnackbar-anchorOriginBottomCenter, &.MuiSnackbar-anchorOriginBottomLeft, &.MuiSnackbar-anchorOriginBottomRight":
                        { bottom: 80 },
                },
            },
        },

        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    backgroundColor: "rgba(var(--ew-surface-rgb), 0.92)",
                    backdropFilter: "saturate(160%) blur(12px)",
                    WebkitBackdropFilter: "saturate(160%) blur(12px)",
                    borderBottom: `1px solid ${tokens.border}`,
                    boxShadow: "none",
                    color: tokens.textPrimary,
                },
            },
        },

        MuiBottomNavigation: {
            styleOverrides: { root: { backgroundColor: tokens.surface } },
        },
        MuiBottomNavigationAction: {
            styleOverrides: {
                root: {
                    color: tokens.textMuted,
                    "&.Mui-selected": { color: tokens.brand },
                    minWidth: 0,
                },
            },
        },

        MuiRadio: {
            styleOverrides: {
                root: {
                    color: tokens.textMuted,
                    "&.Mui-checked": { color: tokens.brand },
                },
            },
        },

        MuiFormControlLabel: {
            styleOverrides: {
                root: { minHeight: 44, alignItems: "center" },
                label: { color: tokens.textSecondary },
            },
        },

        MuiMenuItem: {
            styleOverrides: {
                root: {
                    minHeight: 44,
                },
            },
        },

        MuiCheckbox: {
            styleOverrides: {
                root: {
                    padding: 10,
                },
            },
        },

        MuiBadge: {
            styleOverrides: {
                badge: {
                    backgroundColor: tokens.brand,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 10,
                    minWidth: 18,
                    height: 18,
                    padding: "0 4px",
                },
            },
        },

        MuiStack: {
            defaultProps: {
                useFlexGap: true,
            },
            styleOverrides: {
                root: {
                    minWidth: 0,
                },
            },
        },

        MuiSkeleton: {
            styleOverrides: {
                root: { backgroundColor: tokens.surfaceHi },
                wave: {
                    "&::after": {
                        background:
                            `linear-gradient(90deg, transparent, ${"rgba(var(--ew-text-rgb), 0.04)"}, transparent)`,
                    },
                },
            },
        },

        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontWeight: 700,
                    fontSize: "1.0625rem",
                    letterSpacing: -0.2,
                    pb: 1,
                },
            },
        },

        MuiDialogContent: {
            styleOverrides: {
                dividers: { borderTopColor: tokens.border, borderBottomColor: tokens.border },
            },
        },
    },
});

export default theme;

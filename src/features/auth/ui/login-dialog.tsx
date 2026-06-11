"use client";

import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useRouter } from "@/i18n/server";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { AppButton, AppInput } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

type AuthTab = "login" | "register";

const authFieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: `${tokens.radiusCardLg}px`,
        transition: "box-shadow 0.2s ease, background-color 0.2s ease",
        "&.Mui-focused": {
            bgcolor: tokens.brandDim,
            boxShadow: `0 0 0 3px ${tokens.brandGlow}`,
        },
    },
} as const;

async function readJsonError(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        if (data && typeof data === "object" && "error" in data) {
            const e = (data as { error?: unknown }).error;
            if (typeof e === "string" && e.trim().length > 0) return e;
        }
    } catch {
        /* noop */
    }
    return fallback;
}

export type LoginDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function LoginDialog({ open, onClose }: LoginDialogProps) {
    const router = useRouter();
    const t = useTranslations("auth");
    const tCommon = useTranslations("common");
    const [tab, setTab] = useState<AuthTab>("login");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTab("login");
        setLoginEmail("");
        setLoginPassword("");
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setError(null);
        setLoading(false);
    }, [open]);

    const handleLogin = async () => {
        setError(null);
        const email = loginEmail.trim().toLowerCase();
        if (!email || !loginPassword) {
            const msg = t("errors.credentialsRequired");
            setError(msg);
            showAppToast(msg, "error");
            return;
        }

        setLoading(true);
        try {
            const result = await signIn("credentials", {
                email,
                password: loginPassword,
                redirect: false,
            });

            if (result?.error) {
                const msg = t("errors.invalidCredentials");
                setError(msg);
                showAppToast(msg, "error");
                return;
            }

            showAppToast(t("toast.welcome"));
            onClose();
            router.refresh();
        } catch {
            const msg = tCommon("networkError");
            setError(msg);
            showAppToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setError(null);
        const email = regEmail.trim().toLowerCase();
        const name = regName.trim();

        if (name.length < 2) {
            const msg = t("errors.nameTooShort");
            setError(msg);
            showAppToast(msg, "error");
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const msg = t("errors.invalidEmail");
            setError(msg);
            showAppToast(msg, "error");
            return;
        }
        if (regPassword.length < 8) {
            const msg = t("errors.passwordTooShort");
            setError(msg);
            showAppToast(msg, "error");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: regPassword, name }),
            });

            if (!res.ok) {
                const msg = await readJsonError(res, t("errors.registerFailed"));
                setError(msg);
                showAppToast(msg, "error");
                return;
            }

            const signInResult = await signIn("credentials", {
                email,
                password: regPassword,
                redirect: false,
            });

            if (signInResult?.error) {
                const msg = t("errors.registerAutoLoginFailed");
                setError(msg);
                showAppToast(msg, "error");
                setTab("login");
                setLoginEmail(email);
                return;
            }

            showAppToast(t("toast.registerSuccess"));
            onClose();
            router.refresh();
        } catch {
            const msg = tCommon("networkError");
            setError(msg);
            showAppToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: { borderRadius: 3, p: 0.5 },
            }}
        >
            <DialogTitle sx={{ pr: 6, fontWeight: 700, pb: 0 }}>
                {t("dialog.title")}
                <IconButton
                    onClick={onClose}
                    disabled={loading}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                    aria-label={tCommon("aria.close")}
                >
                    <CloseIcon aria-hidden focusable="false" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1, pb: 3 }}>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, lineHeight: 1.5 }}
                >
                    {t("dialog.subtitle")}
                </Typography>

                <Tabs
                    value={tab}
                    onChange={(_, v: AuthTab) => {
                        setTab(v);
                        setError(null);
                    }}
                    variant="fullWidth"
                    sx={{
                        mb: 2.5,
                        minHeight: 40,
                        "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                        },
                        "& .MuiTabs-indicator": {
                            height: 3,
                            borderRadius: 999,
                        },
                    }}
                >
                    <Tab label={t("tabs.login")} value="login" />
                    <Tab label={t("tabs.register")} value="register" />
                </Tabs>

                {tab === "login" ? (
                    <Stack spacing={2}>
                        <AppInput
                            label={t("fields.email")}
                            type="email"
                            autoComplete="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                        />
                        <AppInput
                            label={t("fields.password")}
                            type="password"
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleLogin();
                            }}
                        />
                        {error ? <Alert severity="error">{error}</Alert> : null}
                        <AppButton
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            onClick={() => void handleLogin()}
                            sx={{
                                py: 1.25,
                                fontWeight: 700,
                                borderRadius: `${tokens.radiusCardLg}px`,
                                boxShadow: "none",
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={22} color="inherit" />
                            ) : (
                                t("login")
                            )}
                        </AppButton>
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <AppInput
                            label={t("fields.name")}
                            autoComplete="name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                        />
                        <AppInput
                            label={t("fields.email")}
                            type="email"
                            autoComplete="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                        />
                        <AppInput
                            label={t("fields.password")}
                            type="password"
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            helperText={t("fields.passwordHint")}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleRegister();
                            }}
                        />
                        {error ? <Alert severity="error">{error}</Alert> : null}
                        <AppButton
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            onClick={() => void handleRegister()}
                            sx={{
                                py: 1.25,
                                fontWeight: 700,
                                borderRadius: `${tokens.radiusCardLg}px`,
                                boxShadow: "none",
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={22} color="inherit" />
                            ) : (
                                t("register")
                            )}
                        </AppButton>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}

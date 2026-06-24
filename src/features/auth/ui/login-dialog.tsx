"use client";

import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useRouter } from "@/i18n/server";
import { EMAIL_NOT_VERIFIED_ERROR } from "@/lib/otp-auth";
import { OTP_TTL_SECONDS } from "@/lib/otp-store";
import { showAppToast } from "@/shared/lib/show-app-toast";
import { AppButton, AppInput } from "@/shared/ui";
import { tokens } from "@/shared/ui/theme";

import { OtpCodeInput, OtpResendTimer } from "./otp-code-input";

type AuthTab = "login" | "register";
type RegisterStep = "form" | "otp";

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

const emptyOtp = ["", "", "", ""] as const;

export type LoginDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function LoginDialog({ open, onClose }: LoginDialogProps) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("auth");
    const tCommon = useTranslations("common");
    const [tab, setTab] = useState<AuthTab>("login");
    const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [otpDigits, setOtpDigits] = useState<string[]>([...emptyOtp]);
    const [resendSeconds, setResendSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [emailExists, setEmailExists] = useState(false);
    const [loading, setLoading] = useState(false);

    const resetState = useCallback(() => {
        setTab("login");
        setRegisterStep("form");
        setLoginEmail("");
        setLoginPassword("");
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setOtpDigits([...emptyOtp]);
        setResendSeconds(0);
        setError(null);
        setEmailExists(false);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!open) return;
        resetState();
    }, [open, resetState]);

    useEffect(() => {
        if (registerStep !== "otp" || resendSeconds <= 0) return;

        const timer = window.setInterval(() => {
            setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [registerStep, resendSeconds]);

    const startOtpStep = useCallback((email: string) => {
        setRegisterStep("otp");
        setRegEmail(email);
        setOtpDigits([...emptyOtp]);
        setResendSeconds(OTP_TTL_SECONDS);
        setError(null);
    }, []);

    const handleResendOtp = async () => {
        const email = regEmail.trim().toLowerCase();
        if (!email) return;

        setLoading(true);
        setError(null);
        try {
            await fetch("/api/auth/resend-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, locale }),
            });
            setResendSeconds(OTP_TTL_SECONDS);
            showAppToast(t("otp.sentAgain"));
        } catch {
            showAppToast(tCommon("networkError"), "error");
        } finally {
            setLoading(false);
        }
    };

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

            if (result?.error === EMAIL_NOT_VERIFIED_ERROR) {
                const msg = t("errors.emailNotVerified");
                setError(msg);
                showAppToast(msg, "error");
                setTab("register");
                setRegPassword(loginPassword);
                startOtpStep(email);
                void fetch("/api/auth/resend-otp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, locale }),
                });
                return;
            }

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

    const switchToLoginWithEmail = useCallback((email: string) => {
        setEmailExists(false);
        setError(null);
        setRegisterStep("form");
        setTab("login");
        setLoginEmail(email);
    }, []);

    const handleRegister = async () => {
        setError(null);
        setEmailExists(false);
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
                body: JSON.stringify({ email, password: regPassword, name, locale }),
            });

            if (!res.ok) {
                try {
                    const data = (await res.json()) as { error?: unknown };
                    if (data.error === "EMAIL_EXISTS") {
                        setEmailExists(true);
                        return;
                    }
                    const msg =
                        typeof data.error === "string" && data.error.trim().length > 0
                            ? data.error
                            : t("errors.registerFailed");
                    setError(msg);
                    showAppToast(msg, "error");
                } catch {
                    const msg = t("errors.registerFailed");
                    setError(msg);
                    showAppToast(msg, "error");
                }
                return;
            }

            const data = (await res.json().catch(() => null)) as
                | { status?: string }
                | null;

            if (data?.status !== "OTP_SENT") {
                const msg = t("errors.registerFailed");
                setError(msg);
                showAppToast(msg, "error");
                return;
            }

            startOtpStep(email);
            showAppToast(t("otp.sent"));
        } catch {
            const msg = tCommon("networkError");
            setError(msg);
            showAppToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const email = regEmail.trim().toLowerCase();
        const codeToSend = otpDigits.join("").trim();

        if (codeToSend.length !== 4) {
            const msg = t("otp.invalidCode");
            setError(msg);
            showAppToast(msg, "error");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: codeToSend }),
            });

            if (!res.ok) {
                try {
                    const data = (await res.json()) as { error?: unknown };
                    if (data.error === "OTP_EXPIRED") {
                        const msg = t("code_expired");
                        setError(msg);
                        setResendSeconds(0);
                        showAppToast(msg, "error");
                        return;
                    }
                } catch {
                    /* noop */
                }
                const msg = t("otp.invalidCode");
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

    const showOtpStep = tab === "register" && registerStep === "otp";

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
                {showOtpStep ? t("otp.title") : t("dialog.title")}
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
                    {showOtpStep ? t("otp.subtitle", { email: regEmail }) : t("dialog.subtitle")}
                </Typography>

                {!showOtpStep ? (
                    <Tabs
                        value={tab}
                        onChange={(_, v: AuthTab) => {
                            setTab(v);
                            setRegisterStep("form");
                            setError(null);
                            setEmailExists(false);
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
                ) : null}

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
                ) : showOtpStep ? (
                    <Stack spacing={2.5}>
                        <OtpCodeInput
                            value={otpDigits}
                            onChange={setOtpDigits}
                            disabled={loading}
                        />
                        {error ? <Alert severity="error">{error}</Alert> : null}
                        <AppButton
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            onClick={() => void handleVerifyOtp()}
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
                                t("otp.confirm")
                            )}
                        </AppButton>
                        <OtpResendTimer
                            secondsLeft={resendSeconds}
                            onResend={() => void handleResendOtp()}
                            codeTimerLabel={t("code_timer")}
                            resendAvailableLabel={t("resend_available")}
                            resendWaitLabel={t("resend_wait")}
                            codeExpiredLabel={t("code_expired")}
                            disabled={loading}
                        />
                        <AppButton
                            variant="text"
                            disabled={loading}
                            onClick={() => {
                                setRegisterStep("form");
                                setError(null);
                            }}
                        >
                            {t("otp.back")}
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
                        {emailExists ? (
                            <Alert severity="warning">
                                {t("email_exists")}{" "}
                                <Link
                                    component="button"
                                    variant="body2"
                                    fontWeight={700}
                                    underline="hover"
                                    onClick={() => switchToLoginWithEmail(regEmail.trim().toLowerCase())}
                                    sx={{ verticalAlign: "baseline" }}
                                >
                                    {t("login_link")}
                                </Link>
                            </Alert>
                        ) : null}
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

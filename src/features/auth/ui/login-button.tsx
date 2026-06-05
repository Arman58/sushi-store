"use client";

import CloseIcon from "@mui/icons-material/Close";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { showAppToast } from "@/shared/lib/show-app-toast";
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

function LoginDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const router = useRouter();
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
            const msg = "Введите email и пароль";
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
                const msg = "Неверный email или пароль";
                setError(msg);
                showAppToast(msg, "error");
                return;
            }

            showAppToast("Добро пожаловать!");
            onClose();
            router.refresh();
        } catch {
            const msg = "Сеть недоступна. Попробуйте ещё раз.";
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
            const msg = "Имя должно быть не короче 2 символов";
            setError(msg);
            showAppToast(msg, "error");
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const msg = "Введите корректный email";
            setError(msg);
            showAppToast(msg, "error");
            return;
        }
        if (regPassword.length < 8) {
            const msg = "Пароль должен быть не короче 8 символов";
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
                const msg = await readJsonError(res, "Не удалось создать аккаунт");
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
                const msg =
                    "Аккаунт создан, но не удалось войти. Попробуйте вкладку «Вход».";
                setError(msg);
                showAppToast(msg, "error");
                setTab("login");
                setLoginEmail(email);
                return;
            }

            showAppToast("Регистрация успешна! Вы вошли в аккаунт");
            onClose();
            router.refresh();
        } catch {
            const msg = "Сеть недоступна. Попробуйте ещё раз.";
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
                Войти в аккаунт
                <IconButton
                    onClick={onClose}
                    disabled={loading}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                    aria-label="Закрыть"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1, pb: 3 }}>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, lineHeight: 1.5 }}
                >
                    Сохраняйте историю заказов и повторяйте их в один клик
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
                    <Tab label="Вход" value="login" />
                    <Tab label="Регистрация" value="register" />
                </Tabs>

                {tab === "login" ? (
                    <Stack spacing={2}>
                        <TextField
                            label="Email"
                            type="email"
                            autoComplete="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                        />
                        <TextField
                            label="Пароль"
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
                        <Button
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
                                "Войти"
                            )}
                        </Button>
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        <TextField
                            label="Имя"
                            autoComplete="name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                        />
                        <TextField
                            label="Email"
                            type="email"
                            autoComplete="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                        />
                        <TextField
                            label="Пароль"
                            type="password"
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            helperText="Минимум 8 символов"
                            fullWidth
                            sx={authFieldSx}
                            inputProps={{ style: { fontSize: 16 } }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void handleRegister();
                            }}
                        />
                        {error ? <Alert severity="error">{error}</Alert> : null}
                        <Button
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
                                "Создать аккаунт"
                            )}
                        </Button>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function LoginButton() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    const isAuthenticated = status === "authenticated" && session?.user?.id != null;
    const displayName = (session?.user?.name ?? "").trim();
    const avatarSrc = session?.user?.image ?? undefined;
    const avatarLabel =
        displayName.length > 0
            ? displayName.charAt(0).toUpperCase()
            : (session?.user?.email ?? "?").charAt(0).toUpperCase();

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (isAuthenticated) {
            setMenuAnchor(event.currentTarget);
        } else {
            setDialogOpen(true);
        }
    };

    if (!isAuthenticated) {
        return (
            <>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LoginOutlinedIcon />}
                    onClick={() => setDialogOpen(true)}
                    sx={{
                        display: { xs: "none", sm: "inline-flex" },
                        fontWeight: 700,
                        borderRadius: 2,
                        textTransform: "none",
                    }}
                >
                    Войти
                </Button>
                <IconButton
                    onClick={() => setDialogOpen(true)}
                    aria-label="Войти"
                    sx={{
                        display: { xs: "inline-flex", sm: "none" },
                        border: `1px solid ${tokens.border}`,
                        bgcolor: tokens.surface,
                    }}
                >
                    <LoginOutlinedIcon fontSize="small" />
                </IconButton>
                <LoginDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
            </>
        );
    }

    return (
        <>
            <IconButton
                onClick={handleClick}
                aria-label="Меню профиля"
                sx={{
                    p: 0.25,
                    border: `1px solid ${tokens.border}`,
                    bgcolor: tokens.surface,
                    "&:hover": { bgcolor: tokens.surfaceHi },
                }}
            >
                <Avatar
                    src={avatarSrc}
                    alt={displayName || "Профиль"}
                    sx={{
                        width: 32,
                        height: 32,
                        fontSize: 14,
                        fontWeight: 700,
                        bgcolor: tokens.brand,
                    }}
                >
                    {avatarLabel}
                </Avatar>
            </IconButton>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { mt: 0.5, minWidth: 200, borderRadius: 2 } }}
            >
                <MenuItem
                    component={Link}
                    href="/profile"
                    onClick={() => setMenuAnchor(null)}
                    sx={{ gap: 1 }}
                >
                    <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
                    Мои заказы
                </MenuItem>
                <MenuItem
                    onClick={async () => {
                        setMenuAnchor(null);
                        await signOut({ redirect: false });
                        router.refresh();
                    }}
                    sx={{ gap: 1 }}
                >
                    <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
                    Выйти
                </MenuItem>
            </Menu>
        </>
    );
}

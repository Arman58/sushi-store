"use client";

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Stack,
    Switch,
    TextField,
    Tooltip,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { validateBannerHref } from "@/lib/banner-href";
import { getLocalizedField } from "@/lib/i18n-utils";
import { tokens } from "@/shared/ui/theme";

export type BannerRow = {
    id: number;
    image: string;
    title: unknown;
    ctaText?: unknown;
    href: string | null;
    position: number;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
};

type BannerStatus = {
    key: "statusHidden" | "statusScheduled" | "statusExpired" | "statusLive";
    color: string;
};

/** Статус показа с учётом дат. */
function statusOf(b: BannerRow): BannerStatus {
    if (!b.isActive) return { key: "statusHidden", color: tokens.textMuted };
    const now = Date.now();
    if (b.startsAt && new Date(b.startsAt).getTime() > now)
        return { key: "statusScheduled", color: "#F59E0B" };
    if (b.endsAt && new Date(b.endsAt).getTime() < now)
        return { key: "statusExpired", color: "#E74C3C" };
    return { key: "statusLive", color: tokens.brand };
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

type BannerRowCardProps = {
    banner: BannerRow;
    index: number;
    total: number;
    /** id баннера, над которым идёт операция (или null). */
    busyId: number | null;
    onPatch: (id: number, body: Record<string, unknown>) => Promise<void>;
    onMove: (index: number, dir: -1 | 1) => void;
    onEditCaption: (banner: BannerRow) => void;
    onDelete: (banner: BannerRow) => void;
};

/** Карточка баннера в админ-списке: превью, ссылка, расписание, действия. */
export function BannerRowCard({
    banner,
    index,
    total,
    busyId,
    onPatch,
    onMove,
    onEditCaption,
    onDelete,
}: BannerRowCardProps) {
    const t = useTranslations("admin.banners");
    const [hrefError, setHrefError] = useState<string | null>(null);

    const status = statusOf(banner);
    const hasCaption = Boolean(getLocalizedField(banner.title, "ru"));

    const patchDate = (field: "startsAt" | "endsAt", value: string) => {
        void onPatch(banner.id, {
            [field]: value
                ? new Date(
                      field === "endsAt"
                          ? `${value}T23:59:59`
                          : `${value}T00:00:00`,
                  ).toISOString()
                : null,
        });
    };

    return (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ sm: "center" }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={banner.image}
                    alt=""
                    style={{
                        width: 200,
                        maxWidth: "100%",
                        aspectRatio: "5 / 2",
                        objectFit: "cover",
                        borderRadius: 8,
                        flexShrink: 0,
                    }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TextField
                        size="small"
                        label={t("linkClickLabel")}
                        defaultValue={banner.href ?? ""}
                        error={Boolean(hrefError)}
                        helperText={hrefError || undefined}
                        onChange={() => {
                            if (hrefError) setHrefError(null);
                        }}
                        onBlur={(e) => {
                            const check = validateBannerHref(e.target.value);
                            if (!check.ok) {
                                setHrefError(
                                    check.code === "forbidden"
                                        ? t("errForbidden")
                                        : t("errFormat"),
                                );
                                return;
                            }
                            setHrefError(null);
                            if ((check.value ?? "") !== (banner.href ?? "")) {
                                void onPatch(banner.id, { href: check.value });
                            }
                        }}
                        fullWidth
                        sx={{ mb: 1 }}
                    />
                    <Button
                        size="small"
                        variant="text"
                        startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => onEditCaption(banner)}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            px: 0.5,
                        }}
                    >
                        {hasCaption
                            ? getLocalizedField(banner.title, "ru")
                            : t("addCaption")}
                    </Button>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                        <TextField
                            size="small"
                            type="date"
                            label={t("showFrom")}
                            InputLabelProps={{ shrink: true }}
                            defaultValue={toDateInput(banner.startsAt)}
                            onBlur={(e) => patchDate("startsAt", e.target.value)}
                            sx={{ width: 160 }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label={t("showTo")}
                            InputLabelProps={{ shrink: true }}
                            defaultValue={toDateInput(banner.endsAt)}
                            onBlur={(e) => patchDate("endsAt", e.target.value)}
                            sx={{ width: 170 }}
                        />
                    </Stack>
                </Box>
                <Stack
                    alignItems="flex-end"
                    spacing={0.75}
                    sx={{ flexShrink: 0 }}
                >
                    <Chip
                        size="small"
                        label={t(status.key)}
                        sx={{
                            fontWeight: 700,
                            color: status.color,
                            borderColor: status.color,
                            bgcolor: "transparent",
                        }}
                        variant="outlined"
                    />
                    <Stack direction="row" alignItems="center" spacing={0.25}>
                        <Tooltip title={t("moveUp")}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={index === 0 || busyId !== null}
                                    onClick={() => onMove(index, -1)}
                                    aria-label={t("moveUp")}
                                >
                                    <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={t("moveDown")}>
                            <span>
                                <IconButton
                                    size="small"
                                    disabled={
                                        index === total - 1 || busyId !== null
                                    }
                                    onClick={() => onMove(index, 1)}
                                    aria-label={t("moveDown")}
                                >
                                    <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip
                            title={
                                banner.isActive ? t("shown") : t("hiddenTip")
                            }
                        >
                            <Switch
                                size="small"
                                checked={banner.isActive}
                                disabled={busyId === banner.id}
                                onChange={(e) =>
                                    void onPatch(banner.id, {
                                        isActive: e.target.checked,
                                    })
                                }
                                inputProps={{ "aria-label": t("shown") }}
                            />
                        </Tooltip>
                        <IconButton
                            size="small"
                            sx={{ color: "#E74C3C" }}
                            disabled={busyId === banner.id}
                            onClick={() => onDelete(banner)}
                            aria-label={t("deleteBanner")}
                        >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Stack>
                </Stack>
            </Stack>
        </Paper>
    );
}

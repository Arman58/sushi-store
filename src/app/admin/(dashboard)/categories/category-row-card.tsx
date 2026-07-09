"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    Box,
    IconButton,
    Paper,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";

import { useLocalizedFieldFn } from "@/features/admin/hooks/use-admin-content-locale";
import { LocalizedStatusChips } from "@/features/admin/ui/localized-status-chips";
import { tokens } from "@/shared/ui/theme";

import { CategoryImageCell, type CategoryRow } from "./category-image-cell";

type CategoryRowCardProps = {
    category: CategoryRow;
    savingId: number | null;
    onImageChange: (id: number, image: string | null) => Promise<void>;
    onPatch: (id: number, body: Record<string, unknown>) => Promise<void>;
    onRename: (category: CategoryRow) => void;
    onDelete: (category: CategoryRow) => void;
};

export function CategoryRowCard({
    category,
    savingId,
    onImageChange,
    onPatch,
    onRename,
    onDelete,
}: CategoryRowCardProps) {
    const t = useTranslations("admin.categories");
    const tCommon = useTranslations("admin.common");
    const lf = useLocalizedFieldFn();
    const busy = savingId === category.id;

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                borderRadius: 2,
                opacity: category.isActive ? 1 : 0.72,
            }}
        >
            <Stack spacing={1.25}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <CategoryImageCell
                        category={category}
                        onImageChange={onImageChange}
                        disabled={busy}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                            {lf(category.name)}
                        </Typography>
                        <LocalizedStatusChips value={category.name} />
                        <Typography
                            variant="caption"
                            sx={{ color: tokens.textMuted, display: "block", mt: 0.5 }}
                        >
                            {category.slug}
                        </Typography>
                    </Box>
                </Stack>

                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Typography variant="body2" color="text.secondary">
                        {tCommon("active")}
                    </Typography>
                    <Switch
                        size="small"
                        checked={category.isActive}
                        disabled={busy}
                        onChange={(e) =>
                            void onPatch(category.id, {
                                isActive: e.target.checked,
                            })
                        }
                        inputProps={{
                            "aria-label": t("categoryActiveAria", {
                                name: lf(category.name),
                            }),
                        }}
                    />
                </Stack>

                <Stack direction="row" justifyContent="flex-end" spacing={0.25}>
                    <Tooltip title={tCommon("rename")}>
                        <IconButton
                            size="small"
                            onClick={() => onRename(category)}
                            aria-label={t("renameCategory")}
                        >
                            <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={tCommon("delete")}>
                        <IconButton
                            size="small"
                            onClick={() => onDelete(category)}
                            aria-label={t("deleteCategory")}
                            sx={{ color: "#E74C3C" }}
                        >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>
        </Paper>
    );
}

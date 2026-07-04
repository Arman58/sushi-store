"use client";

import {
    Box,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";
import { useTranslations } from "next-intl";

export function TableSkeleton() {
    const tCommon = useTranslations("admin.common");

    const headers = [
        tCommon("id"),
        tCommon("image"),
        tCommon("name"),
        tCommon("composition"),
        tCommon("category"),
        tCommon("price"),
        tCommon("created"),
        tCommon("onShelf"),
        "",
    ];

    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    {headers.map((h) => (
                        <TableCell key={h || "actions"}>{h || <span />}</TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <Skeleton width={32} />
                        </TableCell>
                        <TableCell>
                            <Skeleton variant="rectangular" width={50} height={50} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width="80%" />
                        </TableCell>
                        <TableCell>
                            <Skeleton width="90%" />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={100} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={100} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={52} />
                        </TableCell>
                        <TableCell>
                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                <Skeleton variant="circular" width={32} height={32} />
                                <Skeleton variant="circular" width={32} height={32} sx={{ ml: 0.5 }} />
                            </Box>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function MobileListSkeleton() {
    return (
        <Box sx={{ display: { xs: "block", md: "none" }, mt: 2 }}>
            {[0, 1, 2, 3].map((i) => (
                <Paper
                    key={i}
                    elevation={0}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 1.5,
                        mb: 1.5,
                        borderRadius: 3,
                    }}
                >
                    <Skeleton variant="rounded" width={56} height={56} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Skeleton width="70%" />
                        <Skeleton width="40%" sx={{ mt: 0.5 }} />
                    </Box>
                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Skeleton width={64} sx={{ ml: "auto" }} />
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 0.5,
                                mt: 0.5,
                            }}
                        >
                            <Skeleton variant="circular" width={20} height={20} />
                            <Skeleton variant="circular" width={20} height={20} />
                        </Box>
                    </Box>
                </Paper>
            ))}
        </Box>
    );
}

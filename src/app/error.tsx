"use client";

import ErrorOutline from "@mui/icons-material/ErrorOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function Error({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "60vh",
                justifyContent: "center",
                alignItems: "center",
                px: 2,
            }}
        >
            <Stack alignItems="center" spacing={2} maxWidth={400} textAlign="center">
                <ErrorOutline color="error" sx={{ fontSize: 72 }} />
                <Typography variant="h5" component="h1" fontWeight={700}>
                    Упс, что-то пошло не так
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Произошла ошибка при загрузке. Попробуйте обновить страницу.
                </Typography>
                <Button variant="contained" color="primary" onClick={() => reset()}>
                    Обновить страницу
                </Button>
            </Stack>
        </Box>
    );
}

"use client";

import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import WifiOffOutlinedIcon from "@mui/icons-material/WifiOffOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function OfflinePage() {
    return (
        <Box
            component="main"
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 6,
                bgcolor: "background.default",
            }}
        >
            <Stack alignItems="center" spacing={2.5} maxWidth={420} textAlign="center">
                <WifiOffOutlinedIcon sx={{ fontSize: 72, color: "text.disabled" }} />
                <Typography variant="h5" component="h1" fontWeight={800}>
                    Кажется, вы остались без интернета
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Но наше меню всё ещё доступно!
                </Typography>
                <Button
                    component="a"
                    href="/menu"
                    variant="contained"
                    size="large"
                    startIcon={<MenuBookOutlinedIcon />}
                    sx={{
                        mt: 1,
                        borderRadius: 999,
                        px: 4,
                        textTransform: "none",
                        fontWeight: 700,
                    }}
                >
                    В меню
                </Button>
            </Stack>
        </Box>
    );
}

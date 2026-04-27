import SearchOff from "@mui/icons-material/SearchOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export default function NotFound() {
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
            <Stack alignItems="center" spacing={2} maxWidth={440} textAlign="center">
                <SearchOff color="disabled" sx={{ fontSize: 72 }} />
                <Typography variant="h5" component="h1" fontWeight={700}>
                    Страница не найдена
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Похоже, этот ролл или пицца уже съедены, а страница исчезла.
                </Typography>
                <Button variant="contained" color="primary" component={Link} href="/">
                    Вернуться в меню
                </Button>
            </Stack>
        </Box>
    );
}

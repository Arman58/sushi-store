import SearchOff from "@mui/icons-material/SearchOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/** Fallback for routes outside [locale] (e.g. /admin). Storefront uses [locale]/not-found.tsx. */
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
                <Typography variant="h3" component="p" fontWeight={900} color="text.disabled">
                    404
                </Typography>
                <Typography variant="h5" component="h1" fontWeight={700}>
                    Page not found
                </Typography>
                <Button
                    component="a"
                    href="/"
                    variant="contained"
                    color="primary"
                    sx={{ borderRadius: 3, mt: 2, px: 6, textTransform: "none" }}
                >
                    Home
                </Button>
            </Stack>
        </Box>
    );
}

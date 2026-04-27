import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Заказ принят | East West",
};

export default function OrderSuccessPage() {
    return (
        <Container>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    textAlign: "center",
                }}
            >
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80 }} />
                <Typography variant="h4" fontWeight={800} sx={{ mt: 2 }}>
                    Заказ принят!
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 480 }}>
                    Мы получили ваш заказ и уже передали его на кухню. Ожидайте звонка от
                    оператора для подтверждения.
                </Typography>
                <Link href="/" style={{ textDecoration: "none" }}>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ mt: 4, borderRadius: 3, px: 6, textTransform: "none" }}
                    >
                        На главную
                    </Button>
                </Link>
            </Box>
        </Container>
    );
}

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import {
    CONTACT_PHONE,
    CONTACT_PHONE_DISPLAY,
    KITCHEN_ADDRESS,
    OPENING_HOURS,
    SITE_NAME,
} from "@/lib/site-config";

import { tokens } from "./theme";

const footerLinkSx = {
    color: tokens.textSecondary,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    transition: "color 0.15s",
    "&:hover": { color: tokens.textPrimary },
} as const;

export function StoreFooter() {
    return (
        <Box
            component="footer"
            sx={{
                mt: "auto",
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                py: { xs: 4, sm: 5 },
            }}
        >
            <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={{ xs: 3, md: 6 }}
                    justifyContent="space-between"
                >
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                            {SITE_NAME}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                            Доставка суши, пиццы и шаурмы в Ереване и Котайке. Свежие блюда -
                            быстро до вашей двери.
                        </Typography>
                    </Box>

                    <Box component="nav" aria-label="Контакты и документы">
                        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                            Контакты
                        </Typography>
                        <Stack spacing={0.75}>
                            <Typography
                                component="a"
                                href={`tel:${CONTACT_PHONE}`}
                                variant="body2"
                                fontWeight={700}
                                sx={{ ...footerLinkSx, color: tokens.textPrimary, fontSize: 16 }}
                            >
                                {CONTACT_PHONE_DISPLAY}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {KITCHEN_ADDRESS.full}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {OPENING_HOURS.label}
                            </Typography>
                        </Stack>
                    </Box>

                    <Box component="nav" aria-label="Юридическая информация">
                        <Typography variant="overline" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                            Информация
                        </Typography>
                        <Stack spacing={0.75}>
                            {[
                                { href: "/contacts", label: "Контакты" },
                                { href: "/menu", label: "Меню" },
                                { href: "/offer", label: "Публичная оферта" },
                                { href: "/privacy", label: "Политика конфиденциальности" },
                            ].map(({ href, label }) => (
                                <Typography
                                    key={href}
                                    component={Link}
                                    href={href}
                                    variant="body2"
                                    sx={footerLinkSx}
                                >
                                    {label}
                                </Typography>
                            ))}
                        </Stack>
                    </Box>
                </Stack>

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 3 }}
                >
                    © {new Date().getFullYear()} {SITE_NAME}. Все права защищены.
                </Typography>
            </Container>
        </Box>
    );
}

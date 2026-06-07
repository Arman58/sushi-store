import Typography from "@mui/material/Typography";

type SectionTitleProps = {
    children: string;
    /**
     * Подзаголовок секции под крупным H1 страницы (ниже по иерархии, без конкуренции по размеру).
     */
    subdued?: boolean;
};

export function SectionTitle({ children, subdued = false }: SectionTitleProps) {
    if (subdued) {
        return (
            <Typography
                variant="h6"
                component="h2"
                sx={{
                    mb: 2,
                    mt: { xs: 0.5, sm: 1 },
                    fontWeight: 700,
                    letterSpacing: -0.12,
                    lineHeight: 1.35,
                    color: "text.secondary",
                }}
            >
                {children}
            </Typography>
        );
    }

    return (
        <Typography
            variant="h4"
            component="h2"
            sx={{ mb: 3, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}
        >
            {children}
        </Typography>
    );
}

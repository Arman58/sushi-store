import Container from "@mui/material/Container";
import type { ReactNode } from "react";

type PageContainerProps = {
    children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
    return (
        <Container
            maxWidth="lg"
            sx={{
                width: "100%",
                maxWidth: "100%",
                mx: "auto",
                px: { xs: 2, sm: 4 },
                py: { xs: 3, md: 6 },
                overflowX: "clip",
            }}
        >
            {children}
        </Container>
    );
}

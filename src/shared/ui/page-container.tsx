"use client";

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
                py: { xs: 3, md: 6 }, // мобильный — компактнее, десктоп — просторнее
            }}
        >
            {children}
        </Container>
    );
}

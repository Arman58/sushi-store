"use client";

import PhoneIcon from "@mui/icons-material/Phone";
import Button from "@mui/material/Button";

import { CONTACT_PHONE } from "@/lib/site-config";

export function ContactsCallButton() {
    return (
        <Button
            component="a"
            href={`tel:${CONTACT_PHONE}`}
            variant="contained"
            fullWidth
            size="large"
            startIcon={<PhoneIcon />}
            sx={{
                mt: 3,
                py: 1.75,
                borderRadius: 3,
                fontWeight: 800,
                fontSize: "1rem",
            }}
        >
            Позвонить
        </Button>
    );
}

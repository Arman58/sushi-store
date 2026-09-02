"use client";

import Box from "@mui/material/Box";

import { MessengerSupportButtons } from "@/shared/ui";

export function ContactsCallButton() {
    return (
        <Box sx={{ mt: 3, width: "100%" }}>
            <MessengerSupportButtons showPhone={true} />
        </Box>
    );
}


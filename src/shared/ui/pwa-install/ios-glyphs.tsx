import Box from "@mui/material/Box";

type GlyphProps = {
    size?: number;
};

export function IosShareGlyph({ size = 18 }: GlyphProps) {
    return (
        <Box
            component="svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden
            sx={{ display: "inline", verticalAlign: "middle", color: "#007AFF" }}
        >
            <path
                fill="currentColor"
                d="M12 2.2c.34 0 .62.28.62.62v11.36a.62.62 0 1 1-1.24 0V2.82c0-.34.28-.62.62-.62Z"
            />
            <path
                fill="currentColor"
                d="M8.22 6.28a.62.62 0 0 1 .88-.04l2.9 2.62 2.9-2.62a.62.62 0 1 1 .83.92l-3.32 3a.62.62 0 0 1-.83 0l-3.32-3a.62.62 0 0 1-.04-.88Z"
            />
            <path
                fill="currentColor"
                d="M6.4 10.5c.34 0 .62.28.62.62v6.48c0 .55.45 1 1 1h7.96c.55 0 1-.45 1-1v-6.48a.62.62 0 1 1 1.24 0v6.48A2.24 2.24 0 0 1 15.98 20H8.02A2.24 2.24 0 0 1 5.78 17.6v-6.48c0-.34.28-.62.62-.62Z"
            />
        </Box>
    );
}

export function IosPlusAppGlyph({ size = 18 }: GlyphProps) {
    return (
        <Box
            component="svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden
            sx={{ display: "inline", verticalAlign: "middle", color: "#007AFF" }}
        >
            <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                d="M7.2 4.6h9.6A2.6 2.6 0 0 1 19.4 7.2v9.6a2.6 2.6 0 0 1-2.6 2.6H7.2a2.6 2.6 0 0 1-2.6-2.6V7.2A2.6 2.6 0 0 1 7.2 4.6Z"
            />
            <path
                fill="currentColor"
                d="M12 8.1c.34 0 .62.28.62.62v2.66h2.66a.62.62 0 1 1 0 1.24h-2.66v2.66a.62.62 0 1 1-1.24 0v-2.66H8.72a.62.62 0 1 1 0-1.24h2.66V8.72c0-.34.28-.62.62-.62Z"
            />
        </Box>
    );
}

export function IosShareSheetPreview({ itemLabel }: { itemLabel: string }) {
    return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Box
                sx={{
                    width: "100%",
                    maxWidth: 280,
                    borderRadius: "20px",
                    bgcolor: "rgba(var(--ew-text-rgb), 0.06)",
                    p: 1,
                }}
            >
                <Box
                    sx={{
                        opacity: 0.28,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.35,
                        py: 0.95,
                    }}
                >
                    <Box
                        sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "6px",
                            border: "2px solid",
                            borderColor: "text.disabled",
                            flexShrink: 0,
                        }}
                    />
                    <Box
                        sx={{
                            height: 7,
                            width: 88,
                            bgcolor: "text.disabled",
                            borderRadius: 1,
                        }}
                    />
                </Box>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.35,
                        py: 1.1,
                        bgcolor: "background.paper",
                        borderRadius: "12px",
                        boxShadow: "0 1px 0 rgba(var(--ew-text-rgb), 0.04)",
                    }}
                >
                    <IosPlusAppGlyph size={24} />
                    <Box
                        component="span"
                        sx={{
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            letterSpacing: -0.2,
                            color: "text.primary",
                            lineHeight: 1.2,
                        }}
                    >
                        {itemLabel}
                    </Box>
                </Box>
                <Box
                    sx={{
                        opacity: 0.2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.35,
                        py: 0.95,
                    }}
                >
                    <Box
                        sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "6px",
                            border: "2px solid",
                            borderColor: "text.disabled",
                            flexShrink: 0,
                        }}
                    />
                    <Box
                        sx={{
                            height: 7,
                            width: 64,
                            bgcolor: "text.disabled",
                            borderRadius: 1,
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}

/** Consistent skeleton surface — theme-aware (light/dark), zero layout shift. */
export const skeletonSurfaceSx = { bgcolor: "var(--ew-surface-hi)" } as const;

/** Fade-in for streamed content replacing skeletons. */
export const fadeInSx = {
    animation: "fadeIn 0.3s ease-in-out forwards",
} as const;

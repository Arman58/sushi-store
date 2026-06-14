/** Consistent skeleton surface — matches MUI grey.200, zero layout shift. */
export const skeletonSurfaceSx = { bgcolor: "grey.200" } as const;

/** Fade-in for streamed content replacing skeletons. */
export const fadeInSx = {
    animation: "fadeIn 0.3s ease-in-out forwards",
} as const;

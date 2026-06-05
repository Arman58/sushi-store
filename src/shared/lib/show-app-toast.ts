import { useCartStore } from "@/features/cart";

/** Глобальный тост в шапке (LayoutShell Snackbar). */
export function showAppToast(
    message: string,
    severity: "success" | "error" = "success",
): void {
    useCartStore.getState().showAppToast(message, severity);
}

import { useCartStore } from "@/features/cart/model/store";

/** Глобальный тост в шапке (LayoutShell Snackbar). */
export function showAppToast(
    message: string,
    severity: "success" | "error" | "warning" = "success",
): void {
    useCartStore.getState().showAppToast(message, severity);
}

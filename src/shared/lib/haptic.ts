export type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

/**
 * Triggers a device vibration if the navigator.vibrate API is supported.
 * Extremely useful for adding native-like tactile feedback on Android.
 */
export function triggerHaptic(pattern: HapticPattern = "light") {
    if (typeof window === "undefined" || !window.navigator?.vibrate) {
        return;
    }

    try {
        switch (pattern) {
            case "light":
                window.navigator.vibrate(10);
                break;
            case "medium":
                window.navigator.vibrate(20);
                break;
            case "heavy":
                window.navigator.vibrate(30);
                break;
            case "success":
                window.navigator.vibrate([15, 60, 20]);
                break;
            case "error":
                window.navigator.vibrate([20, 40, 20, 40, 30]);
                break;
        }
    } catch {
        // Ignore errors (e.g., if user hasn't interacted with document yet)
    }
}

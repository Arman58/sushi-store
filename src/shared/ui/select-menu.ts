"use client";

import type { MenuProps } from "@mui/material/Menu";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEffect } from "react";

/**
 * Общие настройки выпадающих списков Select.
 *
 * Критично:
 * - портал в `document.body` (не `disablePortal`) — иначе Paper в потоке страницы
 *   «уплывает» от поля при скролле;
 * - scroll lock body включён;
 * - при любом скролле (в т.ч. внутри overflow-контейнеров) меню закрываем —
 *   Popover не пересчитывает якорь на nested scroll.
 */
export const defaultAppSelectMenuPaperSx: SxProps<Theme> = {
    maxWidth: 350,
    maxHeight: 280,
    "& .MuiMenuItem-root": {
        whiteSpace: "normal",
        overflowWrap: "break-word",
        py: 1,
        lineHeight: 1.3,
    },
};

export function mergeAppSelectMenuProps(
    menuProps?: Partial<MenuProps>,
): Partial<MenuProps> {
    const paperProps = menuProps?.PaperProps;
    const overrideSx = paperProps?.sx;

    return {
        ...menuProps,
        // После spread — всегда портал + scroll lock (иначе меню «уплывает»).
        disablePortal: false,
        keepMounted: false,
        disableScrollLock: false,
        PaperProps: {
            ...paperProps,
            sx: [
                defaultAppSelectMenuPaperSx,
                ...(overrideSx
                    ? Array.isArray(overrideSx)
                        ? overrideSx
                        : [overrideSx]
                    : []),
            ],
        },
    };
}

function isScrollInsideSelectMenu(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
        target.closest(
            ".MuiMenu-paper, .MuiPopover-paper, .MuiModal-root, [role='listbox']",
        ),
    );
}

/**
 * Закрывает открытое меню при скролле страницы/resize.
 * `capture: true` ловит nested overflow; скролл внутри самого меню игнорируем.
 */
export function useCloseMenuOnExternalScroll(
    open: boolean,
    onClose: () => void,
): void {
    useEffect(() => {
        if (!open) return;

        const onScroll = (event: Event) => {
            if (isScrollInsideSelectMenu(event.target)) return;
            onClose();
        };

        document.addEventListener("scroll", onScroll, {
            capture: true,
            passive: true,
        });
        window.addEventListener("resize", onClose, { passive: true });
        return () => {
            document.removeEventListener("scroll", onScroll, { capture: true });
            window.removeEventListener("resize", onClose);
        };
    }, [open, onClose]);
}

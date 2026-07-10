"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { alpha, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
    CartLineItem,
    useCartLineValidation,
    useCartStore,
} from "@/features/cart";
import { usePathname } from "@/i18n/server";
import { isStoreOpen } from "@/lib/site-config";
import { ApiError, validatePromo } from "@/shared/api";
import { SauceStrip, UpsellCarousel } from "@/widgets/upsell";

import { CartDrawerFooter } from "./cart-drawer-footer";
import { CartDrawerHeader } from "./cart-drawer-header";
import { CartDrawerPromo } from "./cart-drawer-promo";
import { EmptyCart } from "./empty-cart";

const DRAWER_WIDTH = 420;
const MotionBox = motion.create(Box);

/** Thin shell — no items/validation work while closed (INP on add-to-cart). */
export function CartDrawer() {
    const isCartOpen = useCartStore((s) => s.isCartOpen);
    if (!isCartOpen) return null;
    return <CartDrawerOpen />;
}

function CartDrawerOpen() {
    const t = useTranslations("cart");
    const pathname = usePathname();
    const isCheckoutPage = pathname?.startsWith("/checkout") ?? false;
    const {
        closeCart,
        items,
        removeItem,
        setItemQty,
        clearCart,
        appliedPromoCode,
        setAppliedPromoCode,
        syncPricesWithServer,
    } = useCartStore(
        useShallow((s) => ({
            closeCart: s.closeCart,
            items: s.items,
            removeItem: s.removeItem,
            setItemQty: s.setItemQuantity,
            clearCart: s.clear,
            appliedPromoCode: s.appliedPromoCode,
            setAppliedPromoCode: s.setAppliedPromoCode,
            syncPricesWithServer: s.syncPricesWithServer,
        })),
    );

    const {
        cartLineIssues,
        hasCartLineProblems,
        hasPriceMismatchIssues,
        problematicCartItemIds,
        serverItems,
    } = useCartLineValidation();

    const [promoInput, setPromoInput] = useState("");
    const [clearArmed, setClearArmed] = useState(false);
    useEffect(() => {
        if (!clearArmed) return;
        const id = window.setTimeout(() => setClearArmed(false), 3500);
        return () => window.clearTimeout(id);
    }, [clearArmed]);

    const handleClearClick = () => {
        if (!clearArmed) {
            setClearArmed(true);
            return;
        }
        clearCart();
        setClearArmed(false);
    };

    const [promoError, setPromoError] = useState("");
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoApplying, setPromoApplying] = useState(false);

    const hasItems = items.length > 0;

    const [storeClosed, setStoreClosed] = useState(false);
    useEffect(() => {
        const update = () => setStoreClosed(!isStoreOpen());
        update();
        const id = window.setInterval(update, 60_000);
        return () => window.clearInterval(id);
    }, []);

    const subtotal = items.reduce(
        (s, i) => s + i.calculatedItemPrice * i.quantity,
        0,
    );
    const total = Math.max(0, subtotal - promoDiscount);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const canProceedToCheckout = hasItems && !hasCartLineProblems;
    const isCartOpen = true;

    useEffect(() => {
        if (appliedPromoCode) setPromoInput(appliedPromoCode);
    }, [appliedPromoCode]);

    useEffect(() => {
        let cancelled = false;
        async function sync() {
            if (!appliedPromoCode || !hasItems) {
                if (!cancelled) setPromoDiscount(0);
                return;
            }
            try {
                const res = await validatePromo({
                    code: appliedPromoCode,
                    cartAmount: subtotal,
                    items: items.map((i) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        price: i.calculatedItemPrice,
                    })),
                });
                if (!cancelled) {
                    setPromoDiscount(res.discountAmount);
                    setPromoError("");
                }
            } catch (e) {
                if (!cancelled) {
                    setPromoDiscount(0);
                    setAppliedPromoCode(null);
                    setPromoError(
                        e instanceof ApiError
                            ? e.message || t("promo.invalid")
                            : t("promo.checkFailed"),
                    );
                }
            }
        }
        void sync();
        return () => {
            cancelled = true;
        };
    }, [appliedPromoCode, hasItems, subtotal, setAppliedPromoCode, t, items]);

    const applyPromo = async () => {
        setPromoError("");
        const code = promoInput.trim().replace(/\s+/g, "").toUpperCase();
        if (!code) {
            setPromoError(t("promo.enterCode"));
            return;
        }
        if (!hasItems) return;
        setPromoApplying(true);
        try {
            await validatePromo({
                code,
                cartAmount: subtotal,
                deliveryAmount: 0,
            });
            setAppliedPromoCode(code);
            setPromoInput(code);
            setPromoError("");
        } catch (e) {
            setAppliedPromoCode(null);
            setPromoError(
                e instanceof ApiError
                    ? e.message || t("promo.notFound")
                    : t("promo.checkFailed"),
            );
        } finally {
            setPromoApplying(false);
        }
    };

    const clearPromo = () => {
        setAppliedPromoCode(null);
        setPromoInput("");
        setPromoError("");
        setPromoDiscount(0);
    };

    const theme = useTheme();

    useEffect(() => {
        if (isCheckoutPage && isCartOpen) {
            closeCart();
        }
    }, [isCheckoutPage, isCartOpen, closeCart]);

    useEffect(() => {
        if (!isCartOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isCartOpen]);

    useEffect(() => {
        if (!isCartOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeCart();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isCartOpen, closeCart]);

    const drawerTransition = {
        duration: 0.28,
        ease: [0.25, 1, 0.5, 1] as [number, number, number, number],
    };

    return (
        <AnimatePresence>
            <>
                    <MotionBox
                        key="cart-drawer-backdrop"
                        role="presentation"
                        onClick={closeCart}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                        sx={{
                            position: "fixed",
                            inset: 0,
                            zIndex: theme.zIndex.modal + 9,
                            bgcolor: (t) => alpha(t.palette.common.black, 0.35),
                            backdropFilter: "blur(6px)",
                            WebkitBackdropFilter: "blur(6px)",
                        }}
                    />
                    <MotionBox
                        key="cart-drawer-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cart-drawer-title"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={drawerTransition}
                        sx={{
                            position: "fixed",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: { xs: "100vw", sm: DRAWER_WIDTH },
                            maxWidth: "100vw",
                            height: "100%",
                            maxHeight: "100dvh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            bgcolor: "background.paper",
                            borderLeft: "1px solid",
                            borderColor: "divider",
                            boxShadow: (t) =>
                                `-16px 0 48px ${alpha(t.palette.common.black, 0.14)}`,
                            zIndex: theme.zIndex.modal + 10,
                        }}
                    >
                        <LayoutGroup id="cart-drawer">
                            <Box
                                sx={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                    minHeight: 0,
                                }}
                            >
                                <CartDrawerHeader count={count} onClose={closeCart} />

                                {items.length === 0 && (
                                    <EmptyCart onNavigate={closeCart} />
                                )}

                                {items.length > 0 && (
                                    <>
                                        <Box
                                            sx={{
                                                flex: 1,
                                                minHeight: 0,
                                                overflowY: "auto",
                                                overscrollBehaviorY: "contain",
                                                WebkitOverflowScrolling: "touch",
                                                px: { xs: 2.5, sm: 3 },
                                                py: 2,
                                            }}
                                        >
                                            {hasCartLineProblems && (
                                                <Alert severity="error" sx={{ mb: 2 }}>
                                                    <Stack spacing={1}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 500 }}
                                                        >
                                                            {hasPriceMismatchIssues
                                                                ? t("validation.orderPriceAlert")
                                                                : t("lineProblems.pageAlert")}
                                                        </Typography>
                                                        {hasPriceMismatchIssues && (
                                                            <Button
                                                                color="inherit"
                                                                size="small"
                                                                onClick={() =>
                                                                    syncPricesWithServer(serverItems)
                                                                }
                                                                sx={{
                                                                    alignSelf: {
                                                                        xs: "stretch",
                                                                        sm: "flex-start",
                                                                    },
                                                                    bgcolor: "action.hover",
                                                                    "&:hover": {
                                                                        bgcolor: "action.focus",
                                                                    },
                                                                }}
                                                            >
                                                                {t("validation.syncPrices")}
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </Alert>
                                            )}
                                            <Stack
                                                spacing={0}
                                                divider={null}
                                                component={motion.div}
                                                layout
                                            >
                                                <AnimatePresence initial={false}>
                                                    {items.map((item, index) => (
                                                        <motion.div
                                                            key={item.cartItemId}
                                                            layout
                                                            initial={{
                                                                opacity: 0,
                                                                scale: 0.95,
                                                                height: 0,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                scale: 1,
                                                                height: "auto",
                                                            }}
                                                            exit={{
                                                                opacity: 0,
                                                                scale: 0.95,
                                                                height: 0,
                                                            }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <CartLineItem
                                                                item={item}
                                                                lineIssue={
                                                                    cartLineIssues[item.cartItemId]
                                                                }
                                                                showUnavailableBadge={problematicCartItemIds.includes(
                                                                    item.cartItemId,
                                                                )}
                                                                variant="drawer"
                                                                showDivider={
                                                                    index < items.length - 1
                                                                }
                                                                onIncrease={() =>
                                                                    setItemQty(
                                                                        item.cartItemId,
                                                                        item.quantity + 1,
                                                                    )
                                                                }
                                                                onDecrease={() =>
                                                                    setItemQty(
                                                                        item.cartItemId,
                                                                        item.quantity - 1,
                                                                    )
                                                                }
                                                                onRemove={() =>
                                                                    removeItem(item.cartItemId)
                                                                }
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </Stack>

                                            <Box sx={{ mt: 2.5 }}>
                                                <SauceStrip cartItems={items} />
                                            </Box>

                                            <Box sx={{ mt: 2 }}>
                                                <Typography
                                                    variant="overline"
                                                    color="text.secondary"
                                                    sx={{
                                                        display: "block",
                                                        mb: 1.25,
                                                        letterSpacing: "0.08em",
                                                    }}
                                                >
                                                    {t("upsell_title")}
                                                </Typography>
                                                <UpsellCarousel
                                                    cartItems={items}
                                                    excludeCategorySlugs={["sauces"]}
                                                />
                                            </Box>

                                            <CartDrawerPromo
                                                promoInput={promoInput}
                                                promoError={promoError}
                                                promoApplying={promoApplying}
                                                appliedPromoCode={appliedPromoCode}
                                                hasItems={hasItems}
                                                onPromoInputChange={(value) => {
                                                    setPromoInput(value);
                                                    if (promoError) setPromoError("");
                                                }}
                                                onApply={() => void applyPromo()}
                                                onClear={clearPromo}
                                            />
                                        </Box>

                                        <CartDrawerFooter
                                            subtotal={subtotal}
                                            total={total}
                                            promoDiscount={promoDiscount}
                                            appliedPromoCode={appliedPromoCode}
                                            storeClosed={storeClosed}
                                            hasCartLineProblems={hasCartLineProblems}
                                            canProceedToCheckout={canProceedToCheckout}
                                            isCheckoutPage={isCheckoutPage}
                                            clearArmed={clearArmed}
                                            onClose={closeCart}
                                            onClearClick={handleClearClick}
                                        />
                                    </>
                                )}
                            </Box>
                        </LayoutGroup>
                    </MotionBox>
                </>
        </AnimatePresence>
    );
}

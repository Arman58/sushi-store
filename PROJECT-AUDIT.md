# East West Delivery — Full Project Audit
**Date:** 2026-07-10 · **Scope:** entire repo (391 src files, ~52,265 LOC) · **Stack:** Next.js 16 App Router, React 19, MUI 7, Prisma 6 / PostgreSQL, next-auth 4, next-intl, Zustand, Serwist PWA, Upstash Redis, Vercel

---

## 0. Executive Summary — the brutal part first

**This is not a marketplace. It is a single-vendor food delivery shop.** There is no `Restaurant`/`Vendor` model, no courier model, no multi-tenant anything in `prisma/schema.prisma`. Every comparison to Uber Eats/DoorDash/Wolt fails at the data model, not at the UI. If "marketplace" is the actual ambition, that is a re-architecture, not a refactor. If (more likely, and perfectly valid) this is a single restaurant in Nor Hachn, the right benchmark is a best-in-class D2C store like a Domino's or a Wolt *merchant* storefront — and against that benchmark this project is **surprisingly good**.

**Second hard truth: there are no online payments.** `PaymentMethod` is `CASH | CARD` — card *on delivery*. No Stripe/Idram/ARCA/Telcell integration, no payment intents, no refunds, no webhooks. For a delivery business in 2026 this is the single largest missing revenue feature.

**Third: the engineering fundamentals are far above average** — server-side price verification, atomic promo redemption, per-request CSP nonces, CSRF middleware, JWT revocation via Redis denylist, cache tags, streaming Suspense, PWA, trilingual i18n with translation tables, CI with e2e against real Postgres. Most "food delivery" codebases I audit have none of this. Credit where due.

**Fourth: operational hygiene is where it falls apart.** The build script contains a hardcoded migration-rollback hack, git history is `fix / fix / fix prod`, `.idea/` and debug scripts are committed, tests are thin (7 unit files + 7 e2e tests for 52k LOC), and there is one shared admin password for everyone.

**Overall: 6.5/10.** A strong single-vendor store with enterprise-grade security instincts, held back by ops discipline, missing payments, missing RBAC, and scalability assumptions that break past ~1–2k products.

---

## 1. Architecture — 7/10

**Structure (8/10).** Feature-Sliced-Design-lite: `entities/ → features/ → widgets/ → shared/` plus `app/`, `lib/`, `server/`. Good instinct, inconsistently enforced:

- `src/shared/ui/` is polluted with business components: `cart-drawer.tsx`, `cart-drawer-promo.tsx`, `min-order-progress.tsx`, `header-eta.tsx`, `empty-cart.tsx`. "Shared" means domain-agnostic. Cart UI belongs in `features/cart/ui/`. Right now the dependency direction shared→features is inverted (shared imports cart store), which defeats the entire point of layering.
- `src/server/services/` contains exactly **one** file (`order.service.ts`) while 60+ server modules live in `src/lib/`. Two competing conventions. Worse, `src/lib/order-service.ts` also exists and does something different (status/ETA updates). Two files named "order service" in different layers is a maintenance trap. Pick one home (`src/server/`) and move all server-only code there; add `import "server-only"` guards.
- `src/lib/` is a 60-file junk drawer mixing server-only (`prisma.ts`, `otp-store.ts`), client-safe (`phone.ts`), and edge-only (`csp.ts`) code with nothing marking which is which. One wrong import from a client component and you ship secrets-adjacent code or break the edge bundle.

**Server/Client boundaries (7/10).** RSC usage is genuinely good — `src/app/[locale]/(store)/page.tsx` streams sections via `Suspense` with CLS-aware skeleton decisions and keeps the LCP hero out of Suspense (correct, and the inline comments show the author knows why). But 149 of 391 files are `"use client"` (~38%). The main driver is MUI/Emotion (see §3), not bad discipline.

**State management (8/10).** Zustand cart store (`src/features/cart/model/store.ts`) is one of the better cart implementations I've seen: derived `qtyByProductId` + precomputed totals to avoid O(n) reduces in headers, deferred localStorage writes for INP, versioned persistence with migrations v3→v5, per-line add throttling. Criticisms below in §2.

**API design (6/10).** REST-ish route handlers, consistent-ish. Issues: no API versioning, no shared response envelope (some routes return `{error}`, some plain text — `src/app/api/admin/login/route.ts` returns `text/plain` errors while others return JSON), `src/app/api/admin/products/[id]/route.ts` is a 700-line route handler doing validation + translation + modifier diffing inline — that's a service, not a route.

**Technical debt markers.** Root-level `test-menu-query.ts` and `migration_diff.sql` are committed debugging artifacts. `.idea/` is tracked despite being in `.gitignore` (files were added before the ignore rule — `git rm -r --cached .idea test-menu-query.ts migration_diff.sql`).

**Scalability (4.5/10).** See §3 (full-menu load) and §16 (single-vendor schema). The current design caps out at roughly one restaurant, ~1–2k products, and one city. That's fine if that's the business; fatal if "marketplace" is the plan.

---

## 2. Code Quality — 7.5/10

**The good:** `strict: true`, only 2 `as any` casts in 52k LOC, zod schemas for API payloads, discriminated error codes (`OrderServiceError`, `UpdateOrderStatusError`), `satisfies` usage, exhaustive const-typed rate-limit buckets. This is top-decile typing discipline.

**Findings, in order of severity:**

1. **Hardcoded Russian string in a trilingual app** — `src/features/cart/model/store.ts:324`: `appToastMessage: "Цены в корзине обновлены"`. Armenian and English users get a Russian toast when cart prices resync. The store can't call `useTranslations`, so store should emit a message *key* and the snackbar component (`src/shared/ui/layout-toast-snackbar.tsx`) should translate it.

2. **`syncPricesWithServer` corrupts `basePrice` when a modifier price changes** — `store.ts:307-313` recomputes `basePrice = serverUnitPrice − Σ(stale local modifier deltas)`. If the *modifier* delta changed server-side (not the base price), the local deltas are stale and `basePrice` is silently wrong; the next add of the same product with different modifiers computes a wrong line price. The server should return `basePrice` and per-modifier deltas explicitly; never derive.

3. **God files.** `src/app/admin/(dashboard)/products/product-form-dialog.tsx` (842 lines), `orders/order-row.tsx` (776), `dashboard/page.tsx` (771), `orders/page.tsx` (767), `api/admin/products/[id]/route.ts` (700), `widgets/reviews/ui/product-reviews-section.tsx` (811). Anything over ~300 lines in this codebase correlates with mixed concerns (form state + API calls + translation editing + image upload in one dialog). Split by concern, extract hooks.

4. **`src/lib/i18n-utils.ts:78,155` — the only two `as any` casts, and they sit at the heart of localization**, the function every storefront query flows through. Type the localized-entity mapping properly with generics (`<T extends {translations: Tr[]}>`) instead of casting; a schema rename would currently fail at runtime, not compile time.

5. **Duplicated data-shaping logic.** The category+first-product-image query appears in `menu-catalog-section.tsx`, `test-menu-query.ts`, and (variants) in home widgets. Extract one `getStorefrontMenu(locale)` query module.

6. **35 raw `console.log/error/warn` calls** alongside Sentry. Route errors should go through one logger that tags Sentry context; `console.error("[PUSH ERROR]", ...)` in `src/lib/order-service.ts:102` loses order context.

7. **`decrementFirstLineForProduct`** (`store.ts:269`) decrements an *arbitrary* line when a product has multiple modifier variants in the cart — from a product card the user can't see which variant they're removing. UX bug encoded in the store API. Card minus-buttons should open the cart/variant picker when >1 line exists for the product (Uber Eats does exactly this).

---

## 3. Performance — 6.5/10

**What's already right:** streaming SSR with per-section Suspense, `revalidate = 60` + `unstable_cache` with tags + `revalidateTag` on admin writes (proper ISR-with-invalidation), LCP-conscious hero, deferred localStorage writes, lazy modifier loading (`/api/menu/modifiers` on demand instead of shipping all modifiers in the menu payload — nice), `use-progressive-render.ts` + IntersectionObserver for long lists, font/image immutable cache headers.

**Problems:**

1. **🔴 The menu loads every active product in one unpaginated query** (`menu-catalog-section.tsx`: `prisma.product.findMany({ where: { isActive: true }, include: { translations, category.translations, ... } })`). No `take`, no cursor. At 200 products this is fine; at 2,000 it's a multi-MB RSC payload and a slow TTFB on every 60s cache miss. Same pattern in the API search path. You need category-scoped pagination (cursor on `position, id`) and virtualized rendering before the catalog grows.

2. **🔴 MUI + Emotion is your biggest structural perf tax.** Emotion is runtime CSS-in-JS: it cannot run in Server Components, which is *why* 38% of files are client components, and it re-serializes styles at runtime (INP cost on low-end Android — your core market). Sx-prop-heavy trees (e.g. `theme.ts` at 715 lines) recompute on theme access. Migration to Pigment CSS (MUI's zero-runtime successor, drop-in for `sx`) or at minimum `@mui/material-nextjs` static extraction should be on the roadmap. This is the difference between "feels native" and "feels like a website" on a $150 phone.

3. **Full locale bundle shipped to every client.** `src/app/[locale]/layout.tsx` does `getMessages()` and passes *all* messages (`hy.json` = 75KB raw) into `NextIntlClientProvider`. Admin strings, email strings, checkout strings — on the home page. next-intl supports selecting namespaces: `messages={pick(messages, ['common','cart','menu'])}` per layout segment. Easy ~40-50KB win on first load.

4. **Three animation/carousel libraries.** framer-motion (~30KB gz) + swiper (~40KB) + MUI transitions. Swiper for one promo carousel is expensive; CSS scroll-snap covers 90% of it. Framer-motion for page transitions (`template.tsx`) — check whether the View Transitions API can replace it now.

5. **No bundle budget.** Add `@next/bundle-analyzer` and a CI size check. You can't manage what you don't measure; I couldn't build in this sandbox (no DATABASE_URL), so treat bundle numbers as the first follow-up task: `ANALYZE=true next build`.

6. **DB indexes:** `OrderItem` has **no index on `orderId`** — Prisma/Postgres does NOT auto-index FK columns. Every `order.items` include does a seq scan on the order-items table; painful once you pass ~100k order items. Add `@@index([orderId])`. Also missing: `Product @@index([categoryId, isActive, position])` for category pages, `Order` — fine (`status,createdAt` covered), `SavedAddress` ok.

7. **N+1-adjacent:** `deliveryZone.findFirst({ include: { translations: true } })` and per-order zone lookups are fine at this scale, but `prepareOrderItems` + promo check + zone check are sequential awaits in `createOrder` — ~3 serial round-trips before the transaction. Parallelize the reads.

**Core Web Vitals:** architecture suggests good LCP/CLS (hero in initial HTML, reserved aspect ratios, comments show CLS awareness). INP is the risk (Emotion + MUI on mid-range mobiles). Wire `useReportWebVitals` → Vercel Analytics (installed but verify custom vitals are flowing) and set budgets: LCP < 2.5s p75 mobile, INP < 200ms.

---

## 4. UX Audit — 7/10

Judged from code structure (I can't click through a running instance; discount everything here accordingly).

**Present and well done:** guest checkout with tokenized order tracking (`Order.accessToken` + `/order/[id]?key=`), SSE live order status (`/api/order-status/stream`), scheduled delivery slots with server validation, store-hours gating with preorder fallback, change-from-cash prompt (`changeFrom` + `CHANGE_FROM_TOO_SMALL` — a detail most projects forget), saved addresses, repeat-order data model, min-order progress bar (`min-order-progress.tsx` — great conversion pattern), promo drawer for first-time visitors, pull-to-refresh, cart price-drift reconciliation with user-visible toast, per-line cart validation (`use-cart-line-validation.ts`), skeletons + `loading.tsx` on all main routes, error/empty states (`empty-cart.tsx`, `fatal-error-screen.tsx`, `menu-load-error.tsx`), haptics (`haptic.ts`).

**Gaps vs Uber Eats/Wolt class:**

1. **No order cancellation by the customer.** Status flow is kitchen-controlled only. Industry standard: cancel within N minutes while status=NEW.
2. **No live courier tracking / map.** ETA is a kitchen-set timestamp (`estimatedDeliveryAt`). Fine for one restaurant, but even a static "preparing → on the way" progress map placeholder raises perceived quality.
3. **Delivery zone is a dropdown** (`DeliveryZone` list), not address-based detection. Wolt/Glovo resolve zone from geocoded address. Friction + error source ("wrong zone selected" → `requiresManagerApproval` exists as a band-aid).
4. **`decrementFirstLineForProduct` ambiguity** (§2.7).
5. **Favorites are localStorage-only** (`ew_favorites` key, `src/features/favorites/model/store.ts`) — lost on device switch, invisible to logged-in users across devices, unusable for personalization. There's already a `Cart` server-sync pattern; mirror it for favorites.
6. **Auth friction:** email+password+OTP verification. For food delivery, phone-first OTP login (you already have phone + OTP infra) converts far better; email/password is a 2015 pattern. Also no social login.
7. **No post-order review prompt loop** — reviews exist (verified-purchase flag, helpful votes: genuinely good), but nothing in the order-success/tracker flow appears to solicit them.
8. Checkout is a single 389-line form hook (`useCheckoutForm.ts`) + 587-line DeliverySection — verify on device that it's presented as digestible steps (contact → delivery → payment) rather than one long form; long single forms measurably drop mobile conversion.

---

## 5. Mobile-First — 7.5/10

Strong: dedicated `mobile-bottom-nav.tsx`, `mobile-nav-drawer.tsx`, bottom-sheet patterns, `use-visual-viewport-bottom-inset.ts` (keyboard-aware insets — rare attention to detail), `use-scroll-hide.ts`, `pull-to-refresh.tsx`, haptic feedback, `pwa-nav-arrows.tsx` for standalone mode, `InstallPwaPrompt.tsx`, offline fallback page (`/offline` correctly excluded from i18n routing — the comment shows someone debugged the SW install failure properly), push notifications end-to-end (VAPID, subscriptions per user, locale-aware pushes).

Gaps: no `screenshots`/rich install UI check in `manifest.ts` (verify), no background sync for orders placed offline (queue-and-retry via Serwist is the next PWA step), safe-area handling should be verified on notched devices (search for `env(safe-area-inset)` usage in theme — I did not find it in the files sampled), and PWA is not a substitute for app-store presence if growth matters (consider capacitor wrap later, not now).

---

## 6. UI — 7/10 (code-level; visual polish unverifiable here)

One theme file (`src/shared/ui/theme.ts`, 715 lines) with light/dark support, FOUC-safe `theme-init-script.tsx` + cookie-persisted preference (`theme-preference.server.ts`) — correct SSR dark-mode implementation, which most teams get wrong. Consistent `AppButton/AppInput/AppSelect` wrappers = an emerging design system; keep pushing all raw MUI imports behind these wrappers so a future MUI exit is possible. `skeleton-styles.ts` centralizes loading UI.

Issues: 715-line monolithic theme should split into tokens (palette/typography/spacing) vs component overrides; design tokens are MUI-theme-locked rather than CSS variables (MUI 7 supports `cssVariables: true` — enables theming without hydration cost); no Storybook, so the "component library" has no contract or visual regression safety net.

---

## 7. Product Audit — 5.5/10

**Have:** categories, modifiers/options with required/max, upsells ("frequently bought together" via `ProductUpsell`), reviews + ratings + verified purchase + helpful votes, promo codes with conditions/actions JSON (free delivery, category discounts), delivery zones with min order, scheduled delivery, pickup, guest checkout, order history, saved addresses, recently viewed, favorites (local), push notifications, multi-language (hy/ru/en), Telegram kitchen bot with inline status buttons (excellent ops tooling for a small restaurant).

**Missing, ranked by revenue impact for a single-vendor shop:**

1. **Online payments** (Idram/ARCA/Telcell for Armenia + Stripe for cards). Cash-on-delivery caps AOV and enables no-show losses.
2. **Repeat order / reorder in one tap** from order history (data exists; verify UI exposes it — highest-ROI feature in food delivery, ~30% of orders at incumbents).
3. **Server-synced favorites + "order again" personalization on home.**
4. **Combos/meal deals** — no combo model in schema; sushi is a set-driven category, this is a real gap.
5. **Loyalty/cashback** (even a simple points-per-dram counter) and **referral codes** — `PromoCode` infra is 70% of the way there.
6. **Review photos** (`Review` has no images field) — photo reviews measurably lift conversion on food.
7. **Search:** `/api/search` exists with rate limiting; no suggestions/typo tolerance. At this catalog size, client-side fuzzy (fuse.js over the cached menu) beats a server round-trip.
8. **Address geocoding + zone auto-detection** (see §4.3).
9. Gift cards, multi-currency: skip — wrong market/stage. Voice/AI search: skip — gimmick at this scale.

---

## 8. Admin Panel — 6/10

**Have:** products (with per-locale translation editing + auto-translate endpoint `/api/admin/translate` — nice), categories, orders (with CSV export at `orders/export`), promo codes, banners with scheduling (`startsAt/endsAt`), delivery zones, reviews moderation, kitchen display (`admin/(dashboard)/kitchen`) — a real KDS, analytics dashboard (771 lines, `admin-analytics.ts`).

**Missing for "enterprise":**

1. **🔴 No RBAC — one shared `ADMIN_USER`/`ADMIN_PASS` env credential for every operator.** No admin users table, no roles (owner vs kitchen vs support), no per-person revocation (fire an employee → rotate the shared password → re-login everyone). The JWT is `sub: "admin"` for all. Minimum fix: `AdminUser` model with bcrypt + role enum; the session/denylist infra in `admin-session.ts` already supports per-user jti.
2. **No audit log.** Nobody can answer "who cancelled order #1042" or "who changed this price". One append-only `AuditLog(actor, action, entity, before/after JSON)` table + a helper in the admin mutation path.
3. **No bulk actions** (bulk price update, bulk activate/deactivate) and no product import/export — painful at menu-refresh time.
4. **No inventory/stock** beyond boolean `isAvailable` — no "sold out until tomorrow" auto-reset, no stock counts.
5. Feature flags: `LAUNCHDARKLY_ONBOARDING.md` shows an *abandoned mid-setup* integration (step 4 of 6, SDK "not started"). Either finish it or delete the doc; half-installed vendor onboarding files in the repo are noise. For this team size, a `FeatureFlag` table + admin toggle beats a LaunchDarkly contract.

---

## 9. SEO — 8/10

Strong: `buildLocalizedMetadata` with hreflang-style per-locale URLs, dynamic per-product/category metadata, `sitemap.ts` with localized paths for products+categories, `robots.ts`, JSON-LD (`src/lib/seo/json-ld.tsx`), canonical-host middleware with 308s (apex→www, per `site-config.ts` normalization), `seo-text` widget for category copy, breadcrumb structure in menu paths.

Fixes:

1. **`/profile` is in the sitemap** (`STATIC_PATHS` in `src/app/sitemap.ts`) — a private, auth-gated page. Remove it; also ensure `robots.ts` disallows `/profile`, `/checkout`, `/cart`, `/order`, `/admin`, `/api`.
2. **JSON-LD injection** (`json-ld.tsx:22`) uses `JSON.stringify(data)` into `dangerouslySetInnerHTML` without escaping `<` — if any product name/description ever contains `</script>`, that's stored XSS in every product page. Use `JSON.stringify(data).replace(/</g, "\\u003c")`. Admin-only input today, but §8.1 says admin trust is weak.
3. Verify `Product` JSON-LD includes `AggregateRating` + `Offer` with `priceCurrency: AMD` (rich results for food queries), and `Restaurant` schema on home with `servesCuisine`, `openingHoursSpecification` (config exists in `site-config.ts` — confirm it's emitted).

---

## 10. Security — 8/10 (best area of the project)

Present and correct: per-request CSP nonce in middleware with prod-enforce/dev-report-only and a CDN-cache-poisoning guard (`proxy.ts:38-43` — the author read the CVE), same-origin CSRF check on all mutating `/api` routes with explicit exempt list, `timingSafeStringEqual` admin login, admin JWT with jti + Redis denylist revocation, `__Host-`/`__Secure-` cookie prefixes, HSTS + XFO + nosniff + Permissions-Policy, rate-limit buckets per endpoint class, zod validation + `parse-json-body`, upload validation (size, type, admin-gated, Cloudinary), OTP store failing *closed* in prod without Redis, bcrypt, `escape-html.ts` for email templates.

**Findings:**

1. **🟠 `adminLogin` rate limiting fails OPEN in production when Upstash is down/unconfigured** (`rate-limit.ts:109-116` — deliberate "prevent revenue loss" policy applied to *all* buckets). Correct for `order`; wrong for `adminLogin`/`verifyOtp`/`register`. Redis outage = unthrottled admin brute force against a single shared password. Make auth-class buckets fail closed (or fall back to an in-memory limiter per instance).
2. **🟠 Shared admin credential + no RBAC** (§8.1) is the largest real-world risk — password reuse/leak → full admin. Add per-user admin accounts and TOTP 2FA for admin login.
3. **🟡 `getClientIp` trusts leftmost `x-forwarded-for`** (`rate-limit.ts:82-84`). On Vercel this header is platform-controlled, but the code is deployment-portable and on any other reverse proxy the client can spoof XFF and rotate rate-limit identities infinitely. Prefer `x-real-ip` (or Vercel's `x-vercel-forwarded-for`) first, and document the assumption.
4. **🟡 Admin login `NextResponse.redirect(...)` after POST defaults to 307** (`api/admin/login/route.ts:43`), which re-sends the POST (with credentials in the body) to `/admin/orders`. Browsers handle it, but it's wrong semantics and re-transmits the password to a page route. Use `303`.
5. **🟡 JSON-LD `</script>` escaping** (§9.2).
6. `fail-open` on Redis for admin session *revocation* (`admin-session.ts:63-66`): revoked sessions stay valid during Redis outages. Acceptable trade-off, but note it in the threat model — combined with 12h token TTL it's bounded.
7. Good: `.env*` correctly gitignored and not tracked (verified against `git ls-files`).

---

## 11. Database — 7.5/10

Schema is thoughtful: money as integer AMD (documented!), snapshot columns on `Order` (`deliveryZoneName`, `deliveryPrice`, item name/price snapshots in `OrderItem`) so history survives catalog edits, translation tables with `@@unique([entityId, locale])`, denormalized `ratingAvg/ratingCount` + `helpfulCount` with clear comments, cascade rules mostly right, atomic promo `timesUsed` bump via raw SQL with `maxUsages` guard inside the transaction (`order.service.ts:169-184` — textbook).

Fixes:

1. **`OrderItem` missing `@@index([orderId])`** (§3.6) — the most queried relation in the system.
2. **No CHECK constraints:** `Review.rating` 1..5, `Product.price >= 0`, `OrderItem.quantity > 0` are API-validated only. Prisma supports raw CHECKs via migration SQL; a bad script or future admin bug writes garbage silently.
3. **`PromoCode.conditions/actions` as untyped `Json`** — promo semantics live half in DB JSON, half in `src/lib/promo.ts`. Version the JSON shape (`{v:1, rules:[...]}`) or you can never migrate it safely.
4. `Product.images Json` — same: no shape guarantee; a typed `ProductImage` table would also give you alt-text per image (SEO §9).
5. `OrderItem.productId` intentionally has no FK ("просто храним id") — defensible snapshot pattern, but then `CartLine.productId` *does* have a cascade-delete FK, meaning **deleting a product silently deletes it from users' server carts** while their localStorage copy remains → guaranteed sync conflicts. Use `onDelete: Restrict` + `isActive=false` soft delete for products; you already have the flag.
6. Sqlite `prisma/dev.db` artifact sitting next to a postgres schema — delete it; it confuses every new developer.

---

## 12. API — 6.5/10

Validation via zod at boundaries — good. Error-code enum (`API_ERROR_CODES`) shared with the client for localized messages — good pattern. Order pipeline returns correct semantic statuses (409 for price mismatch/store closed, 422 for promo rejections).

Issues: no versioning (`/api/v1`), inconsistent error envelope (JSON vs plain text, `{error: string}` vs `{error, params}`), no pagination contract anywhere (menu, reviews, admin orders all ad hoc — check `reviews.ts`), no OpenAPI/typed client (the `shared/api/client.ts` fetch wrapper exists; generating types from zod schemas via `zod-openapi` would make the contract explicit), SSE endpoint (`order-status/stream`) has no documented reconnect/backoff contract for the client.

---

## 13. Accessibility — 6/10

161 `aria-*` attributes across the codebase and MUI's baseline a11y gives decent defaults (focus management in dialogs/drawers for free). But: no automated a11y testing (no `axe-playwright` in e2e, no eslint-plugin-jsx-a11y in `eslint.config.mjs`), contrast unverifiable without rendering (dark mode doubles the audit surface), custom components like `pull-to-refresh`, `search-overlay`, `mobile-bottom-nav`, swiper carousels are the classic keyboard-trap/focus-loss suspects, and there's no skip-to-content link visible in `layout-shell.tsx` (verify). Minimum bar: add `@axe-core/playwright` to the 3 existing e2e specs (one line each) and eslint-plugin-jsx-a11y — cheap, catches 60% of issues.

---

## 14. Business Logic — 8/10 (strongest engineering in the repo)

`src/server/services/order.service.ts` is the standout: server re-verification of every item price against DB (`prepareOrderItems`), declared-vs-verified totals cross-check at three levels (items, subtotal, discount, grand total → `PRICE_MISMATCH`/`SUBTOTAL_MISMATCH`/`DISCOUNT_MISMATCH`/`TOTAL_MISMATCH`), zone min-order enforcement, promo re-validation server-side with atomic redemption inside the transaction, store-hours + schedule-slot validation, phone-uniqueness-safe profile update inside the same transaction, cash-change validation. Clients cannot lie to this endpoint. This is better than many funded startups.

Remaining edge cases:

1. **Promo `timesUsed` is incremented even though nothing decrements it if the transaction later fails** — actually it's inside the transaction, so rollback covers it. ✅ But: **promo is per-code, not per-user** — no `maxUsagesPerUser`, so one user can redeem a code N times across orders. Add `PromoRedemption(userId/phone, promoId)` unique tracking.
2. **`TOTAL_MISMATCH` check happens *inside* the transaction after the promo bump** (`order.service.ts:186`) — correct rollback-wise but wastes a promo-row lock; hoist it above `$transaction`.
3. **Phone placeholder `"-"` for pickup orders** (`order.service.ts:190-195`) — a magic sentinel string in the DB. Make `phone` nullable or validate properly; every consumer must now know about `"-"`.
4. **No idempotency key on order creation.** Double-tap + slow network + retry = duplicate orders. Rate limit (5/min) reduces but doesn't eliminate. Accept an `Idempotency-Key` header, unique-constraint it for 24h.
5. Cancelled-order lock exists (`CANCELLED_LOCKED`) but there's no state machine — any status can jump to any other (DONE → COOKING). Encode allowed transitions.
6. No taxes/fees model at all — fine for Armenia cash economy today, blocking for card payments tomorrow (fiscal receipt requirements).

---

## 15. Developer Experience — 5.5/10

**Have:** ESLint 9 flat config + prettier + import sorting + unused-imports, `typecheck` script, CI (lint → typecheck → unit → e2e with real Postgres service container — genuinely good), Sentry across client/edge/server, seed scripts, `ARCHITECTURE.md` (33KB — substantial), README, deploy checklist.

**Failures:**

1. **🔴 The build script**: `"build": "npx prisma migrate resolve --rolled-back 20260709220000_cart_created_at; prisma migrate deploy && ..."`. A one-time incident-recovery command (marking a specific migration rolled back) is hardcoded to run **on every production build forever**, with `;` so its failure is ignored. This will eventually corrupt migration state or mask a real failure. Remove it now; if the migration is genuinely broken, fix `_prisma_migrations` once, manually.
2. **Running migrations during `next build` at all** couples deploys to schema changes and races concurrent builds/previews. Migrations belong in a release step (Vercel: separate `prisma migrate deploy` in a deploy hook or CI job before promote).
3. **Git history is `fix prod / fix prod / fix perfomance / fix / fix`.** Unbisectable, unreviewable, no revert granularity. Adopt conventional commits; you already have CI to enforce it (commitlint).
4. **Tracked junk:** `.idea/` (11 files), `test-menu-query.ts`, `migration_diff.sql` — all committed. `git rm --cached` them; `.gitignore` already covers them.
5. **Test coverage is thin:** 7 unit test files (all on the money paths — right priority) + 3 e2e specs / 7 tests, for 52k LOC. Zero tests on: promo JSON conditions engine (`promo.ts` has a test — ok), cart store migrations v3→v5 (persisted-state migrations are exactly where silent data loss happens), admin routes, review upsert logic, `syncPricesWithServer` (§2.2). No coverage reporting.
6. No `docker-compose.yml` for local Postgres+Redis, no `.nvmrc`, no pre-commit hooks (husky + lint-staged).

---

## 16. Missing Features (consolidated)

Marketplace-blocking (only if that's truly the goal): multi-vendor schema (Restaurant, per-restaurant menus/hours/fees), courier entity + assignment + GPS tracking, vendor dashboards & payouts, commission model, dispatch algorithm. This is a 6–12 month rebuild; do not pretend it's a feature.

Single-vendor roadmap-worthy: online payments · one-tap reorder · combos/sets · server favorites · loyalty points · referral program · photo reviews · per-user promo limits · order cancellation window · address geocoding + zone detection · inventory auto-reset ("back tomorrow") · admin RBAC + audit log · bulk product ops · customer support chat (even a WhatsApp/Telegram deeplink) · post-order review prompt · search suggestions · fiscal receipt integration (required for AM card payments).

---

## 17. Prioritized Roadmap

### 🔴 Critical — this sprint
| # | Item | Impact | Difficulty |
|---|------|--------|-----------|
| 1 | Remove `migrate resolve --rolled-back` from build script; move `migrate deploy` out of build (§15.1–2) | Prevents silent DB corruption | Trivial |
| 2 | Fail-closed rate limiting for `adminLogin`/`verifyOtp`/`register` (§10.1) | Blocks brute force during Redis outage | Low |
| 3 | Add `@@index([orderId])` on `OrderItem` (+ CHECK constraints) (§11.1) | Query perf at scale | Trivial |
| 4 | Fix hardcoded Russian toast → i18n key (§2.1) | Correctness for 2 of 3 locales | Trivial |
| 5 | Escape `<` in JSON-LD; remove `/profile` from sitemap (§9) | XSS hardening + SEO | Trivial |
| 6 | `git rm --cached` .idea/, test-menu-query.ts, migration_diff.sql; adopt conventional commits (§15.3–4) | Repo hygiene | Trivial |
| 7 | Product delete → `Restrict` + soft delete (cart cascade bug, §11.5) | Data integrity | Low |

### 🟠 High — this quarter
| # | Item | Impact | Difficulty |
|---|------|--------|-----------|
| 8 | Online payments (Idram/ARCA + Stripe) with payment-intent flow + idempotency keys (§7.1, §14.4) | Revenue, AOV, no-shows | High |
| 9 | Admin RBAC (AdminUser table, roles, 2FA) + audit log (§8.1–2) | Security, operations | Medium |
| 10 | One-tap reorder + server-synced favorites (§7.2–3) | Retention/conversion | Medium |
| 11 | Menu pagination + category-scoped queries (§3.1) | Scalability ceiling | Medium |
| 12 | Per-locale message splitting (§3.3) + bundle analyzer budget in CI (§3.5) | First-load perf | Low |
| 13 | Order state machine + customer cancellation window (§14.5, §4.1) | Ops correctness | Medium |
| 14 | Fix `syncPricesWithServer` basePrice derivation (§2.2) | Hidden money bug | Low |
| 15 | axe-core in e2e + eslint-plugin-jsx-a11y (§13) | A11y baseline | Low |

### 🟡 Medium — next quarter
Combos/meal deals · per-user promo limits (`PromoRedemption`) · photo reviews + post-order prompt · address geocoding/zone detection · admin bulk actions + import/export · split god files (§2.3) · consolidate `src/lib` vs `src/server` with `server-only` guards · Pigment CSS / MUI static extraction spike (§3.2) · phone-first auth · cart-store migration tests · docker-compose + husky.

### 🟢 Nice to have
Loyalty program · referral codes · Storybook + visual regression · replace swiper with scroll-snap · View Transitions API instead of framer-motion templates · feature-flag table · support chat deeplink · capacitor app wrap · OpenAPI generation from zod.

---

## 18. Final Scores

| Category | Score | One-line justification |
|---|---|---|
| Architecture | 7 | FSD-lite done 80% right; shared-layer pollution, dual server conventions |
| Code Quality | 7.5 | Strict TS, 2 `any` in 52k LOC; god files, one hardcoded-locale bug |
| Performance | 6.5 | Excellent RSC/caching instincts; MUI runtime tax, unpaginated menu, no budgets |
| Security | 8 | CSP nonce, CSRF, revocable JWTs, atomic promos; fail-open auth limiter, shared admin cred |
| SEO | 8 | Localized metadata, sitemap, JSON-LD; /profile leak, escaping nit |
| Accessibility | 6 | MUI baseline + 161 aria attrs; zero automated verification |
| UX | 7 | Guest checkout, SSE tracking, change-from-cash detail; no cancel, zone dropdown friction |
| UI | 7 | Real theme system, SSR-safe dark mode; monolithic theme, no Storybook |
| Scalability | 4.5 | Single-vendor schema, full-menu loads, one shared admin — caps at one busy restaurant |
| Business Logic | 8 | Server-verified pricing + atomic promo redemption is top-tier; no idempotency, no state machine |
| Admin Panel | 6 | Broad coverage incl. KDS + auto-translate; no RBAC, no audit log, no bulk ops |
| Product Quality | 5.5 | Solid table stakes; no payments, no reorder loop, no loyalty |
| Developer Experience | 5.5 | Real CI with e2e; poisoned build script, `fix fix fix` history, thin tests |
| **Overall** | **6.5** | **A well-engineered single-vendor store one ops-discipline push away from excellent — and one honest conversation away from dropping the word "marketplace."** |

---

*Caveats: static analysis only — no running instance, no production data, no Lighthouse/bundle measurements (build requires live DATABASE_URL). First follow-ups that would sharpen this audit: `ANALYZE=true next build`, Lighthouse CI on / and /menu, and a click-through UX review on a mid-range Android device.*

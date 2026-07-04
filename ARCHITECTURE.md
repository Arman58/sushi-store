# East West Delivery - Архитектурный манифест

> Финальный документ по архитектуре проекта.  
> Версия стека: Next.js 16.2.3 · React 19 · Prisma 6 · MUI 7  
> Production: [eastwestnh.com](https://eastwestnh.com)

---

## 1. 🎯 Суть и Бизнес-логика

### Что это за проект

**East West Delivery** - онлайн-витрина доставки еды в **Нор Ачне** (Kotayk, Армения). Бренд объединяет кухни суши, пиццы и шаурмы под одной крышей. Физический адрес кухни: **19 Charents St., Nor Hachn**. Режим работы: **ежедневно 12:00–00:00** (Asia/Yerevan).

Сайт - полноценный e-commerce для food delivery: каталог с модификаторами, корзина с промокодами, чекаут с зонами доставки, трекинг заказа и изолированная админ-панель для операционной команды.

### Основной флоу пользователя (Storefront)

```
Главная / Меню → Карточка товара (+ модификаторы) → Корзина → Чекаут → Трекинг заказа
```

| Этап | Маршрут | Что происходит |
|------|---------|----------------|
| **Витрина** | `/`, `/menu`, `/menu?category={slug}` | Server Components загружают каталог из PostgreSQL. Контент локализуется на сервере до отправки на клиент. Фильтры, поиск, модификаторы - client-side поверх уже локализованных DTO. |
| **Корзина** | `/cart` (drawer + страница) | Zustand (`sushi-cart-v2`, persist в localStorage). Промокод валидируется через `/api/validate-promo`. Цены перепроверяются через `/api/validate-cart`. |
| **Чекаут** | `/checkout` | React Hook Form + Zod. Секции: контакт, доставка/самовывоз, зона, оплата, итог. Черновик сохраняется в localStorage. Honeypot-поле против ботов. |
| **Создание заказа** | `POST /api/order` | Серверная валидация: цены, модификаторы, промокод, subtotal/discount/total. Снимок позиций в `OrderItem`. HttpOnly cookie `order_access_{id}`. Уведомление кухни в Telegram. |
| **Трекинг** | `/order/[id]` | Доступ: cookie **или** legacy `?key=` **или** сессия владельца (NextAuth). React Query polling каждые 10 с для статусов NEW/COOKING/DELIVERING. |
| **Поиск по телефону** | `/order-status` | Требует **id + phone** одновременно - защита от перебора заказов. |

**Дополнительные пользовательские сценарии:**
- Регистрация/логин (NextAuth Credentials, JWT-сессия) - `/profile`
- Lazy email verification - не блокирует оформление заказа
- Самовывоз (`DeliveryType.PICKUP`) - без адреса и зоны, `deliveryPrice = 0`
- Зоны с `requiresManagerApproval` - оформление как заявка, менеджер перезванивает

### Флоу админа

```
/admin/login → JWT cookie admin_auth → CRUD (заказы, товары, промокоды, зоны)
```

| Слой | Механизм | Файл |
|------|----------|------|
| **Edge (proxy)** | Проверка JWT в cookie `admin_auth` на всех `/admin/*` кроме `/admin/login` | `src/proxy.ts` |
| **Layout (Server)** | `requireAdminSession()` - повторная проверка на уровне React Server Components | `src/app/admin/(dashboard)/layout.tsx` |
| **API (Route Handlers)** | `verifyAdmin()` - JWT cookie **или** Basic Auth fallback для скриптов/Postman | `src/lib/verify-admin.ts` |

Админ-панель **изолирована** от витрины: без `LayoutShell`, без next-intl, UI на русском, редактирование JSONB-полей через `LocalizedTextFields`.

**Разделы админки:**
- **Заказы** - статусы, ETA, экспорт CSV, синхронизация с Telegram webhook
- **Товары** - CRUD, модификаторы, загрузка изображений в Cloudinary
- **Промокоды** - PERCENTAGE / FIXED, лимиты использования, минимальная сумма
- **Зоны доставки** - цена, минимальный заказ, флаг «требует звонка менеджера»

### Интеграции

| Сервис | Назначение | Ключевые файлы |
|--------|------------|----------------|
| **Telegram Bot API** | Уведомления кухни о новых заказах; inline-кнопки смены статуса и ETA через webhook | `src/lib/telegram-kitchen.ts`, `src/app/api/telegram/webhook/route.ts` |
| **Resend** | Welcome email при регистрации; resend verification | `src/lib/email.ts`, `src/app/api/auth/register/route.ts` |
| **Cloudinary** | Загрузка изображений товаров (admin-only, folder `east-west-products`) | `src/app/api/upload/route.ts` |
| **Upstash Redis** | Rate limiting (sliding window) на критичных endpoint-ах | `src/lib/rate-limit.ts` |

---

## 2. 🛠 Технологический стек и Ядро

### Runtime и фреймворк

| Компонент | Версия / выбор | Примечание |
|-----------|----------------|------------|
| **Next.js** | 16.2.3 | App Router, Turbopack в dev, `proxy.ts` вместо deprecated `middleware.ts` |
| **React** | 19.2.0 | Server Components по умолчанию; `use client` только где нужна интерактивность |
| **TypeScript** | 5.9.x | Strict mode |
| **Node.js** | 24 LTS (Vercel default) | Fluid Compute |

### База данных

- **PostgreSQL** (Neon / Supabase / Vercel Postgres через Marketplace)
- **Prisma 6.19** - ORM, миграции, seed

**Особенность схемы - JSONB для i18n контента:**

Мультиязычные поля хранятся как `{ hy: string, ru: string, en: string }` в PostgreSQL JSONB:

- `Category.name`
- `Product.name`, `description`, `composition`
- `ModifierGroup.name`, `Modifier.name`
- `DeliveryZone.name`, `description`

Снимки заказов (`OrderItem.name`, `Order.deliveryZoneName`) - **plain string** на момент оформления, чтобы история не менялась при редактировании меню.

**Build pipeline:** `prisma migrate deploy && prisma generate && next build` - миграции применяются автоматически при деплое.

### State Management

| Инструмент | Область | Паттерн |
|------------|---------|---------|
| **Zustand + persist** | Корзина | Единственный global store. Key: `sushi-cart-v2`, version 5 с migrations. Persist: `items`, `appliedPromoCode`, `hasPriceMismatch`. UI-состояние (drawer, toasts) - ephemeral. |
| **React Hook Form + Zod** | Чекаут, order-status, admin forms | `zodResolver`, сообщения через `useSchemaMessages()` из next-intl |
| **React Query (TanStack v5)** | Order tracker | Единственный consumer: polling `/api/order-status`. StaleTime 1 min, gcTime 5 min |
| **NextAuth** | Клиентские сессии | Credentials provider, JWT strategy, lazy email verification |

### UI

- **MUI 7** + Emotion (`@mui/material-nextjs` для SSR cache)
- **Custom UI-Kit** (`src/shared/ui/`): `AppButton`, `AppInput`, `AppSelect` - storefront-формы
- **Framer Motion** - анимации hero, carousel
- **Swiper** - promo carousel

### Архитектура кода (Feature-Sliced Design)

```
src/
├── app/           # Next.js App Router (pages, layouts, API routes)
├── entities/      # Бизнес-сущности (product, cart item types)
├── features/      # Пользовательские сценарии (cart, checkout, auth, filter)
├── widgets/       # Композитные блоки (menu-section, hero, promo-carousel, seo-text)
├── shared/        # UI-kit, lib, api client, schemas
├── lib/           # Server-only utilities (prisma, rate-limit, i18n-utils, seo)
├── i18n/          # next-intl routing, request config, locale-aware navigation
└── messages/      # Static UI dictionaries (hy.json, ru.json, en.json)
```

---

## 3. 🌍 Архитектура i18n (Критически важный раздел)

Локализация - **двухуровневая система** с общими locale-кодами `hy | ru | en` и default `hy`.

### Уровень 1: Статический UI (next-intl)

**Источник:** `src/messages/{hy,ru,en}.json`

**Namespaces:** `common`, `nav`, `hero`, `home`, `menu`, `cart`, `checkout`, `metadata`, `profile`, и др.

**Конфигурация:**
- `src/i18n/routing.ts` - locales, `defaultLocale: "hy"`, `localePrefix: "as-needed"`
- `src/i18n/request.ts` - динамический import словаря по locale
- `src/i18n/server.ts` - locale-aware `Link`, `redirect`, `useRouter`, `usePathname`

**URL-паттерны:**
- Армянский (default): `/menu`, `/checkout`
- Русский: `/ru/menu`, `/ru/checkout`
- English: `/en/menu`, `/en/checkout`

**Routing:** `src/proxy.ts` → `createIntlMiddleware(routing)` для всех non-admin, non-api путей.

**Storefront layout:** `src/app/[locale]/layout.tsx` - `NextIntlClientProvider`, `setRequestLocale()`, `generateStaticParams()`.

**Переключатель языка:** `LanguageSwitcher` - `router.replace(href, { locale })` с сохранением path и query.

### Уровень 2: Динамический контент БД (JSONB)

Контент меню хранится в PostgreSQL как JSONB `{ hy, ru, en }`. Клиент **никогда** не получает сырой JSONB - локализация происходит на сервере.

**Ключевые функции** (`src/lib/i18n-utils.ts`):

| Функция | Назначение |
|---------|------------|
| `getLocalizedField(jsonField, locale)` | Извлекает строку для locale с fallback-цепочкой: запрошенный → `hy` → первый непустой |
| `localizeEntity(entity, locale, fields)` | Shallow-copy с заменой указанных JSONB-полей на строки |
| `localizeProduct` / `localizeProducts` | Product + nested `category.name` |
| `toStorefrontProduct(s)` | Полный DTO для client components |
| `toStorefrontCategories` | Category DTO с plain `name: string` |
| `toStorefrontModifierGroups` | Группы + modifiers локализованы |
| `localizedSlugSource` | Slug из `ru` → `en` → `hy` (admin) |
| `resolveRequestLocale` | Locale из `?locale=` query param (API) |

**Fallback-цепочка** (`pickLocaleString`):
1. Запрошенный locale
2. `hy` (DEFAULT_STORE_LOCALE)
3. Первый непустой среди `STORE_LOCALES`

**Legacy support:** если JSONB содержит plain string (миграция), `getLocalizedField` парсит или возвращает as-is.

**Admin editing:** `LocalizedTextFields` - табbed MUI inputs для hy/ru/en в формах товаров, категорий, зон.

### Бэкенд-локализация ошибок

**Файл:** `src/lib/backend-i18n.ts`

Отдельный от next-intl слой для **API error messages**. Клиент получает уже переведённый `error` string + machine-readable `code`.

**Коды** (`src/shared/lib/api-error.ts`): `PRICE_MISMATCH`, `ITEM_UNAVAILABLE`, `REQUIRED_MODIFIER_MISSING`, `MODIFIER_LIMIT_EXCEEDED`, `INVALID_CART_PAYLOAD`, `SUBTOTAL_MISMATCH`, `DISCOUNT_MISMATCH`, `TOTAL_MISMATCH`, `PROMO_UNAVAILABLE`, `ORDER_NOT_FOUND`, `INTERNAL_SERVER_ERROR`.

**Locale resolution для заказов** (`resolveOrderRequestLocale`):
1. `locale` из body payload
2. Header `X-App-Locale`
3. `Accept-Language`
4. Fallback: `hy`

**Параметризация:** `{name}` и `{group}` подставляются из `getLocalizedField(product.name, locale)` / `getLocalizedField(group.name, locale)`.

**Client handling:** `useCheckoutForm` показывает `error.message` as-is - повторный перевод на клиенте не нужен.

### Схема потока данных

```
URL locale (next-intl)
        │
        ├─► messages/{locale}.json ──► useTranslations / getTranslations ──► UI labels
        │
        └─► Prisma JSONB ──► getLocalizedField(field, locale) ──► plain string DTO ──► React components

Order POST locale ──► backend-i18n.ts ──► localized error JSON ──► client toast
```

### Admin vs Storefront

| Аспект | Storefront | Admin |
|--------|------------|-------|
| UI strings | next-intl (3 языка) | Hardcoded Russian / partial |
| DB content | Resolved at read time by URL locale | Edited as JSONB via LocalizedTextFields |
| List views | N/A | Often `getLocalizedField(..., "hy")` |

---

## 4. 🛡️ Безопасность и Защита (Security Playbook)

### Rate Limiting (Upstash Redis)

**Модуль:** `src/lib/rate-limit.ts`  
**Алгоритм:** Sliding window (`@upstash/ratelimit`)  
**Ключ:** Client IP (`x-forwarded-for` → `x-real-ip` → `request.ip` → `"unknown"`)

| Bucket | Лимит | Окно | Endpoint |
|--------|-------|------|----------|
| `order` | 5 | 60 s | `POST /api/order` |
| `adminLogin` | 5 | 15 m | `POST /api/admin/login` |
| `register` | 5 | 15 m | `POST /api/auth/register` |
| `validateCart` | 20 | 60 s | `POST /api/validate-cart` |
| `validatePromo` | 10 | 60 s | `POST /api/validate-promo` |

### Fail-closed (критично для production)

```
Production + нет UPSTASH_*     → 429 Too Many Requests
Production + Upstash error     → 429 Too Many Requests
Development + нет UPSTASH_*      → fail-open (пропускает)
Development + Upstash error    → fail-open (warn в console)
```

**Anti-leakage:** ответы `"limited"` и `"unavailable"` **идентичны** - `{ error: "Too many requests" }` + `Retry-After: 60`. Атакующий не может определить, исчерпан ли лимит или Redis недоступен.

### Admin Auth (трёхслойная защита)

**1. Proxy (edge):** `src/proxy.ts`
- `/admin/login` - публичный
- Валидный JWT в `admin_auth` → pass; `/admin` → redirect `/admin/orders`
- Невалидный/отсутствующий → redirect `/admin/login?next={pathname}`

**2. JWT Session:** `src/lib/admin-session.ts`
- Algorithm: HS256 (`jose`)
- Payload: `{ sub: "admin" }` - credentials **не** в JWT
- TTL: 12 hours
- Cookie flags: `httpOnly`, `sameSite: "strict"`, `secure` in production, `path: "/"`

**3. Basic Auth fallback (API only):** `src/lib/verify-admin.ts`
- Для Route Handlers и upload: JWT cookie **или** `Authorization: Basic ...`
- Полезно для CI/CD скриптов, Postman, emergency access
- **Не** используется в `proxy.ts` (только cookie на edge)

### Order Access (HttpOnly cookies)

**Проблема MVP:** `?key=uuid` в URL утекает в Referer, историю браузера, логи прокси.

**Решение:** HttpOnly cookie `order_access_{orderId}` со значением `accessToken` (UUID v4, ~122 bit entropy).

| Свойство | Значение |
|----------|----------|
| Cookie name | `order_access_{id}` |
| Max-Age | 30 days |
| Flags | `httpOnly`, `sameSite: "lax"`, `secure` in production |
| Set | `POST /api/order` response |
| Check | `/order/[id]` page - cookie OR legacy `?key=` OR owner session |

**Order status lookup:** `GET /api/order-status` требует **id + phone** - без phone → 403, mismatch → 404 "Order not found".

### Upload Hardening

**Файл:** `src/lib/validate-image-upload.ts`

- **Whitelist extensions:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`, `.avif`
- **Whitelist MIME:** соответствующие image/* типы
- **HEIC exception:** `application/octet-stream` допускается для iOS HEIC
- **Max size:** 5 MB
- **Auth:** `verifyAdmin()` обязателен
- **Client pre-validation:** в `product-form-dialog.tsx` до отправки

### Anti-enumeration (Registration)

**Файл:** `src/lib/register-auth.ts`

```text
GENERIC_REGISTRATION_FAILURE_MESSAGE =
  "Unable to complete registration. Please try again later."
```

- Email exists → 400 + generic message (не "email already registered")
- Race condition (unique constraint) → тот же generic message
- Zod validation → specific field errors (password length и т.д.) - допустимо
- Rate limit → opaque 429

### Дополнительные меры

- **Honeypot** в checkout form (`hp` field)
- **Server-side price validation** - клиентские цены не доверяются
- **Password hashing:** bcrypt, 10 rounds
- **HTML escaping** для Telegram messages (`escape-html.ts`)
- **Webhook auth:** `TELEGRAM_WEBHOOK_TOKEN` header check
- **robots.txt:** disallow `/admin/`, `/api/`, transactional pages

---

## 5. 🚀 Роутинг и Next.js 16 особенности

### proxy.ts - замена middleware

В Next.js 16 файл `middleware.ts` **переименован** в `proxy.ts`, функция `middleware()` → `proxy()`. Это не просто rename - это уточнение роли: network-boundary proxy с Node.js runtime, мотивированное в том числе CVE-2025-29927 (middleware auth bypass).

**Файл:** `src/proxy.ts`

**Matcher:**
```text
/                          - root
/(hy|en|ru)/:path*         - localized routes
/admin, /admin/:path*      - admin panel
/((?!api|admin|_next|_vercel|.*\..*).*)  - catch-all без static files
```

**Логика обработки:**

```
Request
   │
   ├─ /api/*, /_next/*, /_vercel/*  → pass through (no proxy logic)
   │
   ├─ /admin/*                       → handleAdminAuth() (JWT cookie check)
   │
   └─ everything else                → handleI18nRouting() (next-intl middleware)
```

**i18n routing (next-intl):**
- Locale detection из Accept-Language, cookie, URL prefix
- Redirect на canonical locale path
- `localePrefix: "as-needed"` - default locale (`hy`) без префикса

**Admin routing:**
- `/admin/login` - единственный public admin route
- Valid session → `/admin` redirects to `/admin/orders`
- Invalid → `/admin/login?next={originalPath}`

**Migration codemod:** `npx @next/codemod@latest middleware-to-proxy`

### Структура App Router

```
src/app/
├── layout.tsx                    # Root HTML, global metadata, JSON-LD, AppProviders
├── [locale]/
│   ├── layout.tsx                # NextIntlClientProvider, generateStaticParams
│   └── (store)/                  # Route group (не влияет на URL)
│       ├── layout.tsx            # LayoutShell (header, nav, cart drawer, footer)
│       ├── page.tsx              # Home
│       ├── menu/                 # Catalog
│       ├── cart/                 # Cart page
│       ├── checkout/             # Checkout wizard
│       ├── order/[id]/           # Order tracker
│       ├── order-status/         # Phone lookup
│       ├── profile/              # User account
│       ├── contacts/, offer/, privacy/
│       └── order-success/
├── admin/
│   ├── layout.tsx                # Minimal wrapper, NO LayoutShell, NO i18n
│   ├── login/
│   └── (dashboard)/
│       ├── layout.tsx            # requireAdminSession() + AdminShell sidebar
│       ├── orders/
│       ├── products/
│       ├── promocodes/
│       └── delivery-zones/
├── api/                          # Route Handlers (shared backend)
├── robots.ts
└── sitemap.ts
```

### Ключевые различия Storefront vs Admin

| Аспект | `[locale]/(store)` | `admin` |
|--------|-------------------|---------|
| i18n | next-intl, 3 locales | Russian UI, no locale routing |
| Layout | LayoutShell + mobile nav | AdminShell sidebar |
| Auth | NextAuth (customer) | Separate `admin_auth` JWT |
| SEO | Indexable, hreflang | robots disallow, no sitemap |
| UI Kit | AppInput/AppSelect/AppButton | Raw MUI components |

### Legacy routes (технический долг)

Дублирующие non-localized routes существуют в `src/app/(store)/` - legacy от pre-i18n миграции. Канонические маршруты - под `[locale]/(store)/`. Удаление legacy - в roadmap.

### Next.js 16 async APIs

- `cookies()`, `headers()` - async, требуют `await`
- `params`, `searchParams` в page components - async
- `revalidateTag(tag, "max")` - two-arg API

---

## 6. 📱 UI/UX Паттерны

### Mobile-first

- **LayoutShell** - responsive header, hamburger → `MobileNavDrawer`, bottom nav на mobile
- **CartDrawer** - slide-over корзина, не отдельная страница на mobile
- **Touch targets** - увеличенные кнопки в product cards, filter drawer
- **Category pills** - horizontal scroll на mobile
- **Product modifiers dialog** - full-screen на mobile, modal на desktop

### Custom UI-Kit vs raw MUI

**Проблема дефолтного MUI Select:**
- Длинные названия зон доставки обрезаются без ellipsis
- Dropdown menu отрывается от trigger (portal positioning)
- Несогласованный `size` - theme default `medium`, storefront нужен `small`

**Решение - AppSelect** (`src/shared/ui/AppSelect.tsx`):
- `FormControl` + `FormLabel` + `Select` + `FormHelperText` - compound component
- Ellipsis на closed value (`textOverflow: ellipsis`)
- `disablePortal: true` - menu привязан к trigger
- Menu paper: `maxWidth: 350`, `maxHeight: 250`, word-wrap в items
- `forwardRef` для React Hook Form `Controller`

**AppInput:** default `size="small"`, `variant="outlined"`, overflow fix  
**AppButton:** default `variant="contained"`, `color="primary"`

**Admin exception:** product form использует raw MUI - admin не нуждается в mobile-optimized select UX.

### Deferred Rendering (INP optimization)

**Проблема:** тяжёлые client bundles блокируют main thread → плохой Interaction to Next Paint.

**Решения:**

| Паттерн | Где | Зачем |
|---------|-----|-------|
| `next/dynamic` + `ssr: false` | `ProductFormDialog`, `CartDrawer`, `LoginDialog`, `FilterDrawer`, `ProductModifiersDialog` | Lazy load тяжёлых dialogs |
| `next/dynamic` + `ssr: true` + fallback | `HeroSection`, home widgets | SSR для SEO, skeleton для UX |
| `startTransition` | `menu-section.tsx`, `FilterDrawer`, `connected-product-card`, admin products page | Non-urgent state updates не блокируют input |
| `requestAnimationFrame` + deferred mount | Admin product form - shell opens instantly, form mounts next frame | Perceived performance |

**Admin products page pattern:**
1. Click "Add product" → shell dialog opens immediately
2. `startTransition(() => setShouldRenderForm(true))` after rAF
3. Heavy form (Cloudinary, modifiers) mounts deferred

**Checkout note:** `CheckoutWizard` eager-loaded (critical path). Deferred loading вокруг - cart drawer, login dialog.

---

## 7. 🔍 SEO Реализация

### Metadata pipeline

**Central helper:** `src/lib/seo/metadata.ts` → `buildLocalizedMetadata()`

Генерирует для каждой indexable page:
- **Self-referencing canonical** - URL текущей locale версии
- **hreflang alternates** - `hy`, `en`, `ru`, `x-default` (→ default locale)
- **Open Graph** - title, description, url, locale (`hy_AM`, `ru_RU`, `en_US`), alternateLocale, image

**Site config:** `src/lib/site-config.ts` - `SITE_URL`, `SITE_NAME`, contacts, address, hours - единый источник для metadata, JSON-LD, UI.

### JSON-LD Schemas

**Файл:** `src/lib/seo/json-ld.tsx`

| Schema | Где inject | Тип |
|--------|------------|-----|
| `restaurantJsonLd()` | Root layout (global) | Restaurant - address, hours, menu, OrderAction |
| `foodDeliveryServiceJsonLd()` | Root layout (global) | Service - delivery areas (Yerevan, Nor Hachn, Kotayk) |
| `orderJsonLd()` | `/order/[id]` page | Order + OrderItem/Product - только для trackable statuses |

**ItemList schema:** не реализован на текущий момент. Планируется с введением `/menu/[slug]` product pages (см. Roadmap).

### On-page SEO content

**SeoText widget** (`src/widgets/seo-text/ui/SeoText.tsx`) - server-rendered H2 + paragraph на главной. i18n keys: `home.seo_text_*`.

### Indexation control

**NOINDEX pages** (`NOINDEX_METADATA`):
- `/checkout`, `/cart`, `/order/*`, `/order-status`, `/profile`

**robots.ts:**
```text
Allow: /
Disallow: /admin/, /api/, /order/, /checkout, /cart, /order-status, /profile
Sitemap: {SITE_URL}/sitemap.xml
```

**sitemap.ts:**
- Static paths × 3 locales: home, menu, contacts, offer, privacy
- Dynamic: `/menu?category={slug}` × 3 locales из Prisma categories
- `changeFrequency`: daily для home/menu, monthly для legal pages
- `priority`: home 1.0, menu 0.9, categories 0.8

### Cache headers

`next.config.ts` - immutable cache (1 year) для fonts и static images.

---

## 8. 🚨 Критичные переменные окружения (ENV)

Полный список - `.env.example`. Ниже - что **сломается** без каждой переменной в production.

### Database

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `DATABASE_URL` | ✅ | Build fail. Prisma не подключится. Сайт не запустится. |

### Authentication (Customer)

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `NEXTAUTH_SECRET` | ✅ | JWT sessions invalid. Login/register broken. |
| `NEXTAUTH_URL` | ✅ | OAuth callbacks, session cookies misconfigured. Redirect loops. |

### Public URLs

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical URLs пустые. Sitemap empty. OG links broken. Emails с неправильными ссылками. |

### Admin Panel

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `ADMIN_USER` | ✅ | Login impossible. verifyAdmin() returns false. |
| `ADMIN_PASS` | ✅ | Login impossible. |
| `ADMIN_SESSION_SECRET` | ✅ (min 32 chars) | JWT signing fails. Sessions invalid immediately. |

### Rate Limiting

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `UPSTASH_REDIS_REST_URL` | ✅ prod | **Fail-closed:** все rate-limited endpoints → 429. Orders, login, register blocked. |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ prod | Same as above. |

### Email (Resend)

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `RESEND_API_KEY` | ⚠️ | Registration works, но welcome email не отправится. Verification resend broken. |
| `RESEND_FROM` | ⚠️ | Resend rejects sends without verified sender. |

### Telegram (Kitchen)

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `TELEGRAM_BOT_TOKEN` | ⚠️ | Orders создаются, но кухня не получает уведомления. |
| `TELEGRAM_CHAT_ID` | ⚠️ | Same - messages sent nowhere. |
| `TELEGRAM_WEBHOOK_TOKEN` | ⚠️ | Webhook rejects callbacks. Kitchen buttons (status/ETA) broken. |

### Cloudinary (Admin uploads)

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ⚠️ | Image URLs broken on storefront. |
| `CLOUDINARY_API_KEY` | ⚠️ | Upload API returns error. Admin can't add product images. |
| `CLOUDINARY_API_SECRET` | ⚠️ | Same. |

### Contact Info (Storefront UI)

| Variable | Required | Если отсутствует |
|----------|----------|------------------|
| `NEXT_PUBLIC_CONTACT_PHONE` | Optional | Fallback: `+37477774849` |
| `NEXT_PUBLIC_CONTACT_PHONE_DISPLAY` | Optional | Fallback: `+374 77 77 48 49` |

### Development-only

| Variable | Purpose |
|----------|---------|
| `RESEND_DEV_REDIRECT_TO` | Redirect all outgoing emails to dev inbox |

---

## 9. 🗺️ Post-MVP Roadmap

### PWA (Progressive Web App)

- `next-pwa` или `@serwist/next` для service worker
- Offline cart persistence (уже есть via Zustand persist)
- Push notifications для статуса заказа
- Add to Home Screen prompt

### Онлайн-оплата

- **Idram** - популярный в Армении e-wallet
- **Arca** - банковские карты (Armenian Card)
- Payment flow: create intent → redirect/iframe → webhook confirmation → update Order.payment
- Schema change: `PaymentMethod.ONLINE`, `paymentStatus`, `paymentIntentId`

### Централизация валидации корзины

- React Query mutation для `/api/validate-cart` с debounce
- Shared hook `useCartValidation()` - единый source of truth для price mismatch
- Optimistic UI с rollback при расхождении цен
- Background revalidation при focus/interval

### KDS (Kitchen Display System)

- Замена Telegram bot как primary kitchen interface
- WebSocket или SSE для real-time order queue
- Tablet-optimized UI: новые заказы, таймеры, drag-to-status
- Telegram остаётся как fallback notification channel

### Product Pages (`/menu/[slug]`)

- Dedicated SSR pages per product для long-tail SEO
- JSON-LD `Product` + `ItemList` на category pages
- Unique meta descriptions per product per locale
- Internal linking: product → category → home

### Другой технический долг

| Item | Priority | Description |
|------|----------|-------------|
| Remove legacy `app/(store)/` routes | Medium | Duplicate non-localized pages |
| Full backend-i18n coverage | Medium | validate-promo, order-status still have hardcoded strings |
| Remove legacy `?key=` order access | Low | Cookie-only after SMS auth flow |
| Email verification enforcement | Low | Currently lazy - doesn't block orders |
| Admin i18n | Low | Admin UI hardcoded Russian |
| Sitemap/robots consistency | Low | `/profile` in sitemap but disallowed in robots |
| Order SMS notifications | Medium | Magic link via SMS instead of cookie-only |
| Analytics integration | Medium | Vercel Analytics, conversion tracking |
| A/B testing infrastructure | Low | Promo carousel variants |
| Multi-location support | Future | Multiple kitchens, geo-based routing |

---

## Приложение A: API Surface

| Endpoint | Method | Auth | Rate Limit |
|----------|--------|------|------------|
| `/api/order` | POST | Public | order |
| `/api/order-status` | GET | Public (id+phone) | - |
| `/api/validate-cart` | POST | Public | validateCart |
| `/api/validate-promo` | POST | Public | validatePromo |
| `/api/delivery-zones` | GET | Public | - |
| `/api/auth/register` | POST | Public | register |
| `/api/auth/[...nextauth]` | * | NextAuth | - |
| `/api/admin/login` | POST | Public | adminLogin |
| `/api/admin/logout` | POST | Admin | - |
| `/api/admin/products` | CRUD | Admin | - |
| `/api/admin/categories` | CRUD | Admin | - |
| `/api/admin/orders/[id]` | PATCH | Admin | - |
| `/api/admin/promocodes` | CRUD | Admin | - |
| `/api/admin/delivery-zones` | CRUD | Admin | - |
| `/api/upload` | POST | Admin | - |
| `/api/telegram/webhook` | POST | Webhook token | - |

## Приложение B: Order Status Flow

```
NEW → COOKING → DELIVERING → DONE
  ↘ CANCELLED (any stage)
```

**Status updates via:**
- Telegram inline buttons → webhook
- Admin panel manual update
- (Future) KDS drag-and-drop

**Estimated delivery:** `Order.estimatedDeliveryAt` - set by kitchen via Telegram or admin.

---

*Документ актуален на июнь 2026. При архитектурных изменениях обновляйте этот файл в том же PR.*

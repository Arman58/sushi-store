# East West Delivery

Онлайн-витрина доставки суши, пиццы и шаурмы в **Нор Ачне** (Армения).  
Production: [eastwestnh.com](https://eastwestnh.com)

## Что внутри

- **Storefront** - каталог с модификаторами, корзина, чекаут, трекинг заказа
- **Admin panel** - заказы, товары, промокоды, зоны доставки
- **3 языка** - hy (default), ru, en
- **Интеграции** - Telegram (кухня), Resend (email), Cloudinary (media), Upstash (rate limiting)

## Стек

| Слой | Технология |
|------|------------|
| Framework | Next.js 16.2 (App Router, Turbopack, `proxy.ts`) |
| Database | PostgreSQL + Prisma 6 |
| UI | MUI 7 + Custom UI-Kit |
| i18n | next-intl + JSONB в БД |
| State | Zustand (корзина), React Hook Form + Zod, React Query |
| Auth | NextAuth (клиенты), JWT cookie (admin) |

## Быстрый старт

```bash
npm install
cp .env.example .env.local
# Заполните переменные в .env.local (минимум DATABASE_URL, NEXTAUTH_*, ADMIN_*)

npm run prisma:migrate
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).  
Админка: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер (Turbopack) |
| `npm run build` | `migrate deploy` + `generate` + production build |
| `npm run build:local` | Build с `.env.local` |
| `npm run prisma:seed` | Демо-данные в БД |
| `npm run prisma:seed-zones` | Зоны доставки |
| `npm run lint` | ESLint |

## Production (Vercel)

Обязательные переменные - см. [`.env.example`](.env.example) и раздел 8 в [`ARCHITECTURE.md`](ARCHITECTURE.md).

```bash
NEXTAUTH_URL=https://eastwestnh.com
NEXT_PUBLIC_SITE_URL=https://eastwestnh.com
UPSTASH_REDIS_REST_URL=...      # required - без Redis prod fail-closed (429)
UPSTASH_REDIS_REST_TOKEN=...
```

Скрипт `build` автоматически выполняет `prisma migrate deploy` перед `next build`.

## Документация

**[ARCHITECTURE.md](ARCHITECTURE.md)** - полный архитектурный манифест:

1. Бизнес-логика и user/admin flows
2. Технологический стек
3. Двухуровневая i18n (next-intl + JSONB)
4. Security playbook (rate limiting, fail-closed, cookies)
5. Роутинг и Next.js 16 `proxy.ts`
6. UI/UX паттерны и UI-Kit
7. SEO (hreflang, JSON-LD, robots)
8. ENV variables reference
9. Post-MVP roadmap

## Структура проекта

```
src/
├── app/
│   ├── [locale]/(store)/   # Storefront (i18n)
│   ├── admin/              # Admin panel (isolated)
│   └── api/                # Route Handlers
├── entities/               # Product, cart types
├── features/               # cart, checkout, auth, filter
├── widgets/                # menu-section, hero, promo-carousel
├── shared/                 # UI-kit, lib, schemas
├── lib/                    # Server utilities
├── i18n/                   # next-intl config
├── messages/               # UI dictionaries (hy, ru, en)
└── proxy.ts                # Next.js 16 proxy (i18n + admin auth)
```

## Лицензия

Private. All rights reserved.

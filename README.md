# East West Delivery

Онлайн-витрина доставки суши, пиццы и шаурмы в Нор Ачне (Армения). Заказ через корзину, оформление с доставкой или самовывозом, админ-панель для меню и заказов.

## Стек

- **Next.js 16** (App Router)
- **Prisma** + PostgreSQL
- **MUI 7** + Emotion
- **next-intl** (hy / ru / en)
- **NextAuth** (клиентские аккаунты)
- **Zustand** (корзина), **React Hook Form** + **Zod** (чекаут)

## Быстрый старт

```bash
npm install
cp .env.example .env.local
# Заполните переменные в .env.local

npm run prisma:migrate
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

### Полезные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер |
| `npm run build` | Миграции + generate + production build |
| `npm run build:local` | Build с `.env.local` (локально) |
| `npm run prisma:seed` | Наполнение БД демо-данными |
| `npm run lint` | ESLint |

## Production

Сайт: [eastwestnh.com](https://eastwestnh.com)

На Vercel задайте все переменные из `.env.example`. Для production:

- `NEXTAUTH_URL=https://eastwestnh.com`
- `NEXT_PUBLIC_SITE_URL=https://eastwestnh.com`

Скрипт `build` автоматически выполняет `prisma migrate deploy` и `prisma generate` перед `next build`.

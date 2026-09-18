# Northstar

AI-сервис персонального маршрута поступления для учеников 10–11 классов из Казахстана, выбирающих англоязычный бакалавриат по Computer Science в UK и Нидерландах.

> Маршрут вместо хаоса вкладок: объяснённый shortlist, сравнение и ближайший шаг.

## Что решает продукт

Northstar превращает профиль пользователя — оценки, экзамен, бюджет, страны и ограничения — в связный сценарий из семи стадий:

1. Landing
2. Profile
3. Diagnosis
4. Recommendations
5. Compare
6. Roadmap
7. Next step

Авторизованные данные сохраняются в Supabase Postgres и защищены Row Level Security. В `localStorage` остаётся только временный черновик анкеты до сохранения.

## Возможности

- multi-step анкета с валидацией возраста и GPA;
- интерпретированная диагностика профиля;
- персональные рекомендации с объяснением fit;
- сравнение стоимости, требований, дедлайнов и языка;
- подбор демонстрационных стипендий;
- экспорт дедлайнов и ближайшего шага в `.ics`;
- персональный roadmap;
- сохранение чек-листа между сессиями;
- адаптивный интерфейс и поддержка `prefers-reduced-motion`;
- rule-based fallback без обязательного API-ключа.
- email/password авторизация и защищённые маршруты;
- AI-evaluator со связностью Major / Spike и региональными весами;
- radar chart профиля против среднего поступившего;
- редактируемые cold-email черновики;
- 650 синтетических публичных профилей для leaderboard;
- приватный шортлист и сравнение 2–4 вузов с последней AI-оценкой;
- персональный roadmap по требованиям вузов из шортлиста;
- восстановление пароля и полное удаление аккаунта.

## Стек

- React 18
- Vite 6
- Tailwind CSS 3
- Lucide React
- Supabase Auth + Postgres + Row Level Security + Edge Functions
- React Router
- Recharts

## Запуск локально

```bash
npm install
npm run dev
```

Production-сборка:

```bash
npm run build
npm run preview
```

## Supabase

1. Установить Supabase CLI и связать проект: `supabase link --project-ref <ref>`.
2. Применить миграции и seed: `supabase db reset` локально либо `supabase db push`, затем выполнить `supabase/seed.sql` в SQL Editor.
3. Развернуть Edge Functions: `supabase functions deploy evaluate-profile` и `supabase functions deploy delete-account`.
4. Добавить секреты функций: `supabase secrets set ANTHROPIC_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...`.
5. Скопировать `.env.example` в `.env.local` и заполнить публичные ключи Supabase.

В настройках Auth → URL Configuration добавь production URL и `${production_origin}/reset-password` в разрешённые redirect URLs.

Для локального Supabase: `supabase start`, затем `npm run dev`.

## Переменные окружения

Frontend (`.env.local`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Edge Function secrets:

- `ANTHROPIC_API_KEY` — опционально; без него работает персонализированный rule-based fallback;
- `SUPABASE_SERVICE_ROLE_KEY` — обязателен для `delete-account` (и серверных обновлений оценки); хранить только в Edge Function secrets, никогда не передавать во frontend.

## Сценарий для жюри

1. Нажать «Собрать мой маршрут».
2. Пройти пять шагов профиля с исходными значениями.
3. Посмотреть диагностику и открыть рекомендации.
4. Выбрать минимум две программы и сравнить их.
5. Добавить дедлайн в календарь.
6. Открыть Roadmap и финальный ближайший шаг.
7. Вернуться в профиль через верхний степпер.
8. Изменить бюджет, страну или экзамен и проверить пересчёт shortlist.
9. Обновить страницу и убедиться, что прогресс сохранился.

## Обновление базы и функций

```bash
supabase db push
supabase functions deploy evaluate-profile
supabase functions deploy delete-account
```

Для чистого локального окружения вместо `db push` можно выполнить `supabase db reset`: он применит все миграции по порядку и затем `supabase/seed.sql`.

## Данные и ограничения

Датасет программ локальный и предназначен для хакатонного прототипа. Стоимость, требования, дедлайны, fit и стипендии помечены как демонстрационные или ориентировочные. Northstar не гарантирует поступление; перед подачей нужно сверить сведения с официальными страницами университетов.

## Архитектурная расширяемость

Новые страны и программы добавляются строками в `universities`, а региональные правила — в Edge Function. Миграции, seed и AI-функция находятся в `supabase/`; UI разделён на маршруты без изменения бренда Northstar.

## Команда

- Product / UX
- Frontend / Full-stack
- AI / Data

Роли можно заменить именами участников перед сабмитом.

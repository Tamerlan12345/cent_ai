# Centras CodeAI · Курс «Вайб-кодинг 2026»

Учебная платформа, на которой ученик без программистского бэкграунда проходит путь
от идеи до защищаемого MVP в стиле работы с agent-first IDE (главный пример — **Google
Antigravity**). Cursor, Claude Code, Codex и Gemini CLI разбираются как часть
экосистемы, но базовый трек и все практики идут в нашей встроенной Monaco-песочнице,
чтобы ученик не ставил себе никаких CLI до выпуска MVP.

## Стек

- React 19 + TypeScript + Vite
- React Router v7
- Zustand (стейт-стор для интерактивного тура)
- Supabase (auth, контент, прогресс — с фолбэком на bundled-content)
- Monaco Editor (`@monaco-editor/react`) — встроенная IDE-песочница
- Lucide React (иконки)

## Быстрый старт

```bash
npm install
npm run dev
```

Платформа поднимется на `http://localhost:5173`. Без подключения к Supabase
контент берётся из `src/content/courseData.ts` — этого достаточно для
демонстрации курса.

Для подключения Supabase создайте `.env` по образцу `.env.example` и заполните
`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.

```bash
npm run build   # сборка для прода
npm run lint    # проверка ESLint
npm run preview # запустить собранную версию
```

## Структура курса

Курс — 4 недели. Каждый модуль содержит **слайды**, **практику** и **квиз**.
Контент описывает программу 2026 года с упором на Antigravity workflow.

| Неделя | Тема                                                                        |
| ------ | --------------------------------------------------------------------------- |
| 1      | Мышление вайб-кодера, экосистема 2026, выбор идеи, Vibe Coding Canvas       |
| 2      | Контекстный пакет (Project Brief, AGENTS.md, CLAUDE.md, GEMINI.md), Git/GitHub |
| 3      | Antigravity Editor + Manager, сборка MVP, обзор Claude Code/Codex/Gemini CLI |
| 4      | QA, Red Team, supply-chain, внутренний деплой, защита, roadmap v0.1 → v1.0 |

Контент полностью на русском, под аудиторию без программистского бэкграунда.

## Главные особенности платформы

### Встроенная Monaco-песочница

`src/components/CodeEditor.tsx` — заменяет внешний IDE на время обучения:
вкладки `index.html` / `styles.css` / `main.js`, live preview через `iframe srcdoc`,
анализатор ошибок, шпаргалка промптов, **симуляция Antigravity Manager** (план →
шаги → артефакт) и встроенные **снапшоты** (мини-Git).

### Внутренний деплой `/preview/:id`

Кнопка «Опубликовать в песочнице» сохраняет HTML/CSS/JS как `DeployedSnapshot`
(`src/lib/sandboxStore.ts`) и открывает его по адресу `/preview/:id`. Это
**не настоящий хостинг** — но достаточно, чтобы показать ссылку куратору и
одногруппникам, не настраивая Netlify/Vercel. После курса проект переносится
на GitHub Pages / Netlify / Vercel — см. библиотеку ресурсов.

### Машинные квоты вместо Docker

Сервер платформы у автора один и без Docker. Ресурсы раздаются
**административно**: куратор в `TeacherDashboard` задаёт каждому ученику RAM,
CPU, число одновременных `/preview/:id` и лимит времени сессии. Ученик видит
свою квоту в плашке «Системные ограничения песочницы» поверх Monaco. Это
честно и педагогически полезно — учит работать в реальных ограничениях.

### Контентная архитектура

`src/lib/contentService.ts` загружает курс из Supabase (`courses → modules →
blocks`); если БД пуста или недоступна — берёт `src/content/courseData.ts`.
Преподаватель может править контент кодом, потом переносить в БД без правки
UI. Типы в `src/types.ts`.

### Роли

- `student` — проходит курс, прогресс по неделям блокирован «активной неделей» когорты
- `teacher` — открывает кабинет куратора: расписание, квоты, сданные работы, деплои
- `admin` — то же, что teacher + полный доступ

## Где что лежит

```
src/
  App.tsx                 — маршруты, аутентификация, активная неделя
  types.ts                — Slide, PracticeTask, ResourceQuota, DeployedSnapshot и др.
  components/
    Hero.tsx              — посадка
    ModuleTimeline.tsx    — список модулей курса
    SlideDeck.tsx         — просмотр слайдов
    CodeEditor.tsx        — Monaco-песочница с Agent Manager + квотами + деплоем
    PromptBuilder.tsx     — конструктор промптов для практик типа prompt
    PracticeTimer.tsx     — таймер практики
    Quiz.tsx              — квиз
    Auth.tsx              — вход через Supabase
    TeacherDashboard.tsx  — кабинет куратора (расписание, квоты, работы)
    DeployPreview.tsx     — экран /preview/:id
    Navbar.tsx            — навигация
    ResourceLibrary.tsx   — Инженерная библиотека
    tour/                 — интерактивный онбординг
  content/
    courseData.ts         — программа курса (4 недели) + библиотека ресурсов
  lib/
    contentService.ts     — Supabase ↔ bundled content
    sandboxStore.ts       — квоты и /preview/:id в localStorage
    progressService.ts    — прогресс ученика
    aiGateway.ts          — проверка ДЗ ИИ (Gemini через edge-функцию)
    analytics.ts          — аналитика поведения
  supabaseClient.ts       — Supabase client + isRealSupabaseConfigured
```

## Документы и шаблоны для учеников

См. `docs/`:

- `docs/TEACHER_GUIDE.md` — как куратору вести курс
- `docs/GIT_GUIDE.md` — минимум Git для новичка
- `docs/SECURITY_GUIDE.md` — гигиена секретов, supply-chain
- `docs/PROMPT_LIBRARY.md` — библиотека промптов под все недели
- `docs/templates/` — VIBE_CODING_CANVAS, PROJECT_BRIEF, AGENTS, CLAUDE, GEMINI,
  TEST_PLAN, PR_TEMPLATE

## Файлы памяти для агентов

В корне репозитория лежат:

- `AGENTS.md` — универсальный контракт для Antigravity / Codex / Copilot agent
- `CLAUDE.md` — инструкции для Claude Code
- `GEMINI.md` — инструкции для Gemini CLI
- `.cursorrules` — правила для Cursor (как альтернативы Antigravity)

Если работаете с агентом — он прочитает их первыми. Если правите контент
курса — посмотрите туда же, там же подробные правила.

## Лицензия

Внутренний учебный проект Centras. Использование вне курса — по согласованию с автором.

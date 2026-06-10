# AGENTS.md — Centras CodeAI

Контракт для агентных платформ (Google Antigravity, OpenAI Codex,
GitHub Copilot cloud agent и любых других, поддерживающих AGENTS.md).
Читается агентом первым, до всего остального.

## Project

Учебная LMS-платформа курса «Вайб-кодинг 2026» для русскоязычной аудитории
без программистского бэкграунда. Основная аудитория контента — Google
Antigravity workflow; Cursor, Claude Code, Codex, Gemini CLI упоминаются как
часть экосистемы.

## Stack

- React 19 + TypeScript + Vite
- React Router v7
- Zustand (для интерактивного тура)
- Supabase (auth, контент, прогресс) + fallback на bundled `courseData.ts`
- Monaco Editor (`@monaco-editor/react`)
- Lucide React (иконки)

## Commands

```bash
npm install
npm run dev      # запуск dev-сервера (Vite)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # запустить собранную версию
```

## Architecture Map

- `src/App.tsx` — маршруты, аутентификация, активная неделя когорты
- `src/types.ts` — `Slide`, `PracticeTask`, `CourseModule`, `ResourceQuota`,
  `DeployedSnapshot` и др.
- `src/content/courseData.ts` — содержание 4 недель + ресурсы (русский язык)
- `src/lib/contentService.ts` — Supabase ↔ bundled content
- `src/lib/sandboxStore.ts` — квоты и `/preview/:id` (localStorage)
- `src/components/CodeEditor.tsx` — Monaco-песочница + Agent Manager симуляция
- `src/components/DeployPreview.tsx` — экран `/preview/:id`
- `src/components/TeacherDashboard.tsx` — кабинет куратора (расписание, квоты, работы)

## Rules

- Маленькие diff: один шаг — один файл — один коммит. Большие переписки
  только при явной просьбе.
- Russian-first: весь UI-текст и контент курса — на русском. Технические
  термины не переводим (Pull Request, Pairing, Delegation и т.п.).
- Никогда не удаляй существующие слайды/практики/квизы без явного запроса.
- Никогда не добавляй новые зависимости без обсуждения. Уже стоят:
  React/TS/Vite/Supabase/Monaco/Lucide/Zustand/React Router — этого хватает
  для всего курса.
- Никаких секретов в коде. Все ключи — через `.env`, который в `.gitignore`.
- Перед изменением `courseData.ts` уточни: меняем UX или контент. Это разные риски.
- Для квот и деплоев используй `src/lib/sandboxStore.ts`, не работай с
  `localStorage` напрямую из компонентов.
- iframe-превью использует `sandbox="allow-scripts"` без `allow-same-origin`
  — нельзя давать ученическому коду доступ к `localStorage` платформы.
- TypeScript: режим strict. Никаких `any` без явной причины.
- Стили — через CSS-переменные из существующих токенов (`--accent-primary`,
  `--bg-card`, `--border-color` и т.п.). Свои цвета — последнее средство.

## Content rules (для правок courseData.ts)

- Структура `Slide` зафиксирована в `types.ts` — не вводи новые типы без
  обновления типа `Slide['type']`.
- Каждая неделя — слайды + одна `PracticeTask` + квиз минимум 5 вопросов.
- Слайды нумерованы: `1-1`, `1-2`, ..., `1-N` — сохраняй формат.
- ResourceLink-категории — только из `ResourceCategory` в `types.ts`.

## Done criteria

- Сборка проходит: `npm run build` без ошибок и warning-ов.
- Линтер чист: `npm run lint`.
- Все маршруты открываются: `/`, `/program`, `/slides`, `/practice`,
  `/resources`, `/auth`, `/tour`, `/preview/:id`, `/teacher`.
- Контент `courseData.ts` рендерится: ModuleTimeline показывает 4 модуля,
  SlideDeck — слайды текущей недели, Quiz — вопросы.
- Если правил CodeEditor — нажми «Запуск» в Monaco, проверь, что нет
  ошибок в Live Preview.

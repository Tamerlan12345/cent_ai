# ТЗ v2: Centras CodeAI как интерактивный симулятор вайбкодинга

## 0. Главная логика

Платформа должна учить не "смотреть слайды", а проходить полный цикл вайбкодера:

```text
AI-грамотность
-> формулировка идеи
-> промпт/бот/медиа-замысел
-> мини-тренажер
-> IDE-миссия
-> AI-подсказка
-> diff-ревью
-> автопроверка
-> свободная песочница
-> личный MVP
-> QA/security
-> защита
```

Каждый учебный блок должен заканчиваться артефактом, который студент может показать:

- промпт;
- brief;
- картинка/storyboard;
- мини-игра;
- snapshot;
- `/preview/:id`;
- MVP-сценарий;
- TEST_PLAN;
- речь защиты;
- AI-оценка.

Если тема не ведет к артефакту, она не должна быть центральным материалом курса. Ее место - библиотека ресурсов, справка или второй уровень.

## 1. Что нужно исправить в текущем замысле

### 1.1. Проблема: много экосистемы до первого действия

Сейчас курс рано говорит про Antigravity, Claude Code, Codex, Gemini CLI, MCP, GitHub, хостинги. Для новичка это выглядит как список инструментов, а не путь.

Исправление:

- В ядре оставить: ChatGPT/Gemini как AI-помощники, платформа курса как песочница, Antigravity как образ будущей IDE.
- Claude Code, Codex, Gemini CLI, MCP, Copilot cloud agent, Supabase production, Vercel/Netlify вынести в "после базового курса" или ресурсы.
- На первом экране каждого блока показывать не инструмент, а действие: "собери помощника", "оживи кнопку", "опубликуй игру", "проверь XSS".

### 1.2. Проблема: теория не всегда связана с практикой

Слайды есть, но после них студент попадает в длинное задание. Не хватает промежуточной интерактивной лестницы.

Исправление:

```text
Слайд -> мини-чекпоинт -> тренажер -> IDE-миссия -> проверка шага -> свободный режим
```

Мини-чекпоинт должен занимать 1-2 минуты: выбрать правильный вариант, исправить короткий промпт, сопоставить HTML/CSS/JS, найти риск в diff.

### 1.3. Проблема: практика не управляет вниманием

Текущая `/practice` показывает задание, чек-лист, таймер, IDE/PromptBuilder и quiz. Это уже рабочая база, но для новичка она слишком "общая".

Исправление:

- Добавить Mission Runner поверх текущей практики.
- Каждый шаг должен иметь один фокус: один файл, один элемент, одно действие.
- На экране всегда видно:
  - где я сейчас;
  - что нажать;
  - что должно измениться;
  - как проверить;
  - что делать, если не получилось.

### 1.4. Проблема: AI-оценка пока не доказывает работоспособность

`CodeEditor` и `PromptBuilder` отправляют пустые `staticResults` и `functionalResults`. Это значит, что итог сильно зависит от LLM-ревью.

Исправление:

- Сначала deterministic checks.
- Потом LLM-ревью.
- Если нет статических/функциональных проверок, максимальный score ограничить.
- Для мини-игр и MVP-сценариев обязательно запускать iframe-tests.

### 1.5. Проблема: нет единого "портфолио прогресса"

Сейчас прогресс - проценты и завершенные недели. Для обучения вайбкодингу важнее список созданных артефактов.

Исправление:

- Добавить понятие `LearningArtifact`.
- Показывать ученику: "Ты уже создал: AI-помощник, 2 промпта для медиа, игру 1, игру 2, первый MVP-деплой".
- В кабинете куратора показывать не только submissions, но и артефакты.

## 2. Единый учебный цикл студента

Ниже не "фазы разработки" и не "недели", а один полный путь ученика. Реализовывать систему нужно так, чтобы этот путь проходился end-to-end.

### Шаг 1. Вход и ориентация

Экран: `/` -> CTA "Начать с онбординга".

Что происходит:

- студент за 7-10 минут проходит `/tour`;
- выбирает один мини-проект;
- видит, что AI не пишет напрямую в файлы без ревью;
- отправляет первый промпт;
- принимает/отклоняет diff;
- ломает проект в симуляции;
- чинит через Loop Breaker;
- получает бейдж.

Правка:

- В конце `/tour` кнопка должна вести не просто на `/slides`, а на следующий логичный блок: "AI-грамотность и промпты".
- Если пользователь не зарегистрирован, после бейджа показывать "Создать аккаунт и сохранить прогресс".

### Шаг 2. AI-грамотность и персональный помощник

Цель: ученик понимает, чем отличаются обычный чат, GPT/Gem, IDE-агент и встроенный AI-коуч платформы.

Контент:

- ChatGPT/Gemini: универсальные помощники.
- GPTs/Gems: персональный бот с постоянной инструкцией.
- IDE-агент: работает с файлами и diff.
- AI-коуч платформы: учебная имитация с ограничениями и проверками.
- Что нельзя отправлять AI: ключи, пароли, персональные данные, рабочие секреты.

Практика:

- собрать инструкцию для личного AI-ментора;
- написать промпт для объяснения сложной темы;
- написать промпт для генерации идей MVP;
- улучшить плохой промпт через тренажер `prompt-fix`;
- получить AI-оценку.

Артефакт:

- `AI_HELPER_BRIEF.md` или структурированный prompt object.

Критерии зачета:

- есть роль помощника;
- есть задачи, которые он решает;
- есть запреты;
- есть формат ответа;
- нет секретов/персональных данных.

### Шаг 3. Медиа-промпты: картинки и видео

Цель: ученик понимает, как использовать генерацию изображений/видео для продукта, не превращая это в игрушку.

Контент:

- картинка нужна для: обложки, moodboard, иллюстрации боли, hero-экрана, карточки персонажа;
- видео нужно для: storyboard, демо-сценария, объяснения идеи, pitch;
- хороший медиа-промпт: объект, контекст, стиль, композиция, свет, ограничения, формат, референс;
- критика результата: соответствует ли задаче, нет ли лишних деталей, понятен ли пользовательский смысл.

Практика:

- `Image Prompt Lab`: улучшить слабый промпт для обложки проекта;
- `Video Prompt Lab`: собрать storyboard из 5 кадров;
- AI оценивает промпт, но реальную генерацию пока можно не запускать.

Артефакты:

- `IMAGE_PROMPT_1`;
- `IMAGE_PROMPT_2`;
- `VIDEO_STORYBOARD_PROMPT`.

Guardrail:

- реальная генерация изображений/видео только после отдельного gateway, moderation, quota и storage.

### Шаг 4. Переход от идеи к экрану

Цель: ученик перестает мыслить "сделай приложение" и начинает мыслить сценарием.

Контент:

```text
боль пользователя -> главный сценарий -> экран -> элементы -> данные -> действия
```

Практика:

- выбрать одну идею;
- описать одного пользователя;
- описать 5 шагов сценария;
- выбрать, какие элементы нужны на экране;
- назначить DOM id для каждого элемента;
- получить AI-оценку "реалистично / раздутo / непонятно".

Артефакт:

- `VIBE_CODING_CANVAS`;
- `USER_SCENARIO`;
- `SCREEN_ELEMENT_MAP`.

Критерии зачета:

- один пользователь, не "все";
- одна боль;
- один главный сценарий;
- не больше 3 функций MVP;
- явно записано "не входит в MVP";
- есть список элементов интерфейса.

### Шаг 5. IDE-онбординг через две мини-игры

Цель: ученик впервые работает в IDE без страха.

Экран: `/practice` открывает Mission Workspace, а не просто длинное задание.

Миссия A: "Кликер монет"

- Навык: DOM, `addEventListener`, state, `textContent`.
- Шаги:
  1. Найти `#coin` и `#counter` в HTML.
  2. Объявить переменную счета.
  3. Повесить click handler.
  4. Увеличить счет.
  5. Обновить `counter.textContent`.
  6. Сделать snapshot.
  7. Опубликовать `/preview/:id`.
- Проверки:
  - `#coin` существует;
  - `#counter` существует;
  - JS содержит `addEventListener`;
  - после клика счет увеличивается на 1;
  - console без ошибок.

Миссия B: "Угадай число"

- Навык: input, condition, feedback, random, reset.
- Шаги:
  1. Найти `#guess-input`, `#check-btn`, `#result`.
  2. Сгенерировать secret number.
  3. Прочитать значение input.
  4. Обработать пустое значение.
  5. Сравнить число.
  6. Показать "меньше / больше / угадал".
  7. Сделать snapshot и deploy.
- Проверки:
  - input/button/result существуют;
  - пустой ввод не ломает приложение;
  - верный ответ показывает победу;
  - неверный ответ дает подсказку;
  - console без ошибок.

После зачета:

- открывается "Свободная песочница";
- студент может попросить AI-коуча идеи развития;
- AI предлагает 3 безопасных улучшения, но не меняет код напрямую.

### Шаг 6. Собственный MVP: первый рабочий сценарий

Цель: ученик переносит навык из мини-игр в свой проект.

Практика:

- выбрать тип проекта:
  - трекер;
  - калькулятор;
  - генератор;
  - чек-лист;
  - мини-каталог;
  - карточки обучения;
  - личный помощник;
- сгенерировать Project Brief;
- сгенерировать AGENTS.md;
- собрать первый экран;
- добавить dummy data;
- реализовать один сценарий;
- сделать snapshot;
- сделать `/preview/:id`;
- получить AI-оценку.

Артефакты:

- `PROJECT_BRIEF`;
- `AGENTS_MD`;
- `TEST_PLAN`;
- `MVP_SNAPSHOT`;
- `FIRST_DEPLOY_URL`.

Критерии зачета:

- есть один главный сценарий;
- экран соответствует сценарию;
- данные пока dummy/local;
- нет бэкенда, авторизации, платежей;
- проект можно объяснить за 60 секунд;
- первый сценарий работает в preview.

### Шаг 7. QA, безопасность и защита

Цель: ученик доводит MVP до состояния, которое можно показать.

Практика:

- пройти `TEST_PLAN`;
- запустить Red Team prompt;
- закрыть XSS;
- добавить LocalStorage `try/catch`;
- проверить пустые поля, длинные строки, спецсимволы;
- сделать финальный snapshot;
- сделать финальный deploy;
- сгенерировать речь защиты;
- получить AI-оценку финального MVP.

Артефакты:

- `QA_REPORT`;
- `SECURITY_FIX_SUMMARY`;
- `FINAL_DEPLOY_URL`;
- `DEFENSE_SCRIPT`;
- `ROADMAP_V1`.

Критерии зачета:

- Quality Gate закрыт;
- нет console errors;
- пользовательский ввод безопасно выводится;
- LocalStorage не ломает приложение при битом JSON;
- финальная ссылка открывается;
- речь укладывается в 3 минуты.

## 3. Новый экран: Mission Workspace

Mission Workspace - главный экран практики. Его нужно строить поверх текущей `/practice`, не ломая существующие `PromptBuilder` и `CodeEditor`.

### 3.1. Layout

Desktop:

```text
┌────────────────────────────────────────────────────────────┐
│ Mission Header: название, прогресс, score, артефакты       │
├───────────────┬─────────────────────────┬──────────────────┤
│ Задание/шаг   │ Monaco / PromptBuilder  │ Preview / Tests  │
│ Подсказки     │ Diff / файлы            │ Console / AI     │
│ DoD           │                         │                  │
├───────────────┴─────────────────────────┴──────────────────┤
│ Artifact Dock: snapshot, diff, deploy, submit, free mode    │
└────────────────────────────────────────────────────────────┘
```

Mobile:

- слайды, quiz и prompt-тренажеры доступны;
- IDE-миссии показывают предупреждение "лучше пройти на ноутбуке";
- можно смотреть задание и результат, но редактирование Monaco не считать основной мобильной задачей.

### 3.2. Состояния

Каждая миссия должна поддерживать:

- `not_started`;
- `intro`;
- `step_active`;
- `checking`;
- `step_passed`;
- `step_failed`;
- `hint_open`;
- `diff_review`;
- `mission_passed`;
- `free_sandbox`;
- `submitted`.

### 3.3. Правила шага

Каждый шаг обязан иметь:

- одну цель;
- один ожидаемый результат;
- одну кнопку проверки;
- максимум 3 подсказки;
- критерий перехода дальше;
- короткое объяснение ошибки.

Запрещено делать шаги вида "собери всю логику". Нужно дробить:

```text
плохо: "реализуй игру"
хорошо: "объяви переменную score и покажи 0 в #counter"
```

## 4. AI Coach

AI Coach - не свободный чат, а учебный помощник с режимами.

### 4.1. Режимы

- `Mentor`: объясняет без кода.
- `Navigator`: указывает файл, элемент, функцию.
- `Prompt Doctor`: улучшает промпт.
- `Builder`: предлагает маленький diff.
- `Reviewer`: проверяет diff.
- `Red Team`: ищет edge cases и безопасность.
- `Media Critic`: оценивает image/video prompt.

### 4.2. Лестница подсказок

AI не должен сразу выдавать готовый код.

```text
Подсказка 1: объяснение принципа
Подсказка 2: куда смотреть
Подсказка 3: псевдокод
Подсказка 4: маленький diff через Diff Auditor
```

Если студент трижды ошибся на одном шаге:

- предложить "разбор ошибки";
- показать минимальный diff;
- после применения diff попросить ученика объяснить, что изменилось.

### 4.3. Ответ AI Coach

Формат ответа:

```json
{
  "mode": "Mentor",
  "summary": "Коротко что не так",
  "nextAction": "Что сделать сейчас",
  "risk": "Что может сломаться",
  "diff": null
}
```

Для `Builder`:

```json
{
  "mode": "Builder",
  "summary": "Что предлагаю изменить",
  "nextAction": "Проверь diff",
  "risk": "Почему это безопасно",
  "diff": {
    "file": "main.js",
    "original": "...",
    "modified": "..."
  }
}
```

## 5. Проверка и оценка

Оценка должна быть не "ИИ сказал молодец", а доказуемая.

### 5.1. Три слоя

1. Static checks:
   - HTML парсится;
   - нужные селекторы есть;
   - JS синтаксически валиден;
   - есть нужные паттерны.

2. Functional checks:
   - iframe-тесты через `consoleBridge`;
   - клик, input, submit, LocalStorage, render проверяются действием.

3. Rubric review:
   - LLM объясняет сильные/слабые стороны;
   - LLM не является единственным источником истины.

### 5.2. Правило score

- Нет static checks -> максимум 70.
- Нет functional checks для code-миссии -> максимум 60.
- Есть console error -> максимум 75.
- Есть failed required check -> максимум 79.
- Полный зачёт -> только если required static + required functional + rubric >= 80.

### 5.3. Что записывать в submission

Submission должен хранить:

- `mission_id`;
- `module_id`;
- `student_id`;
- `artifact_ids`;
- `payload`;
- `static_results`;
- `functional_results`;
- `rubric_results`;
- `score`;
- `model`;
- `rubric_version`;
- `created_at`.

## 6. Данные и типы

Минимальное расширение `src/types.ts`:

```ts
export type PracticeMode = 'classic' | 'mission';

export interface PracticeTask {
  id: string;
  title: string;
  type: 'prompt' | 'code';
  mode?: PracticeMode;
  missions?: PracticeMission[];
  // existing fields remain unchanged
}

export type MissionType =
  | 'prompt'
  | 'ide'
  | 'diff'
  | 'media'
  | 'qa'
  | 'defense';

export interface PracticeMission {
  id: string;
  title: string;
  type: MissionType;
  durationMinutes: number;
  intro: string;
  scenario: string;
  expectedArtifact: string;
  starter?: SandboxStarter;
  steps: MissionStep[];
  checks: MissionCheck[];
  rubric: string[];
  unlocksFreeSandbox: boolean;
}

export interface SandboxStarter {
  html?: string;
  css?: string;
  js?: string;
  prompt?: string;
}

export interface MissionStep {
  id: string;
  title: string;
  instruction: string;
  target: 'html' | 'css' | 'js' | 'prompt' | 'preview' | 'diff' | 'media';
  successCondition: string;
  hints: string[];
  requiredCheckIds: string[];
}

export interface MissionCheck {
  id: string;
  label: string;
  kind: 'selector' | 'js-pattern' | 'functional' | 'rubric' | 'manual';
  required: boolean;
  config: unknown;
}

export interface LearningArtifact {
  id: string;
  studentId: string;
  moduleId: number;
  missionId: string;
  type: 'prompt' | 'media-prompt' | 'code' | 'snapshot' | 'deploy' | 'brief' | 'defense';
  title: string;
  payload: unknown;
  createdAt: string;
}
```

Важно:

- `mode` и `missions` optional, чтобы старые практики не сломались.
- `config: unknown`, не `any`.
- Сначала хранить artifacts в localStorage service, потом перенести в Supabase.

## 7. Конкретные правки по файлам

### 7.1. `src/types.ts`

Добавить типы:

- `PracticeMode`;
- `MissionType`;
- `PracticeMission`;
- `MissionStep`;
- `MissionCheck`;
- `LearningArtifact`;
- optional `mode` и `missions` в `PracticeTask`.

Нельзя:

- ломать текущий `PracticeTask`;
- делать обязательными новые поля;
- вводить `any`.

### 7.2. `src/content/courseData.ts`

Обновить содержание вокруг полного цикла.

Перенести в ядро:

- AI-помощники, GPTs/Gems, Gemini/GPT;
- промпты для картинок и видео;
- IDE-миссии с двумя мини-играми;
- личный MVP;
- QA/security/защита.

Убрать из ядра в ресурсы:

- глубокий обзор Claude Code/Codex/Gemini CLI;
- MCP;
- внешний production deploy;
- подробный GitHub PR flow.

Добавить `missions`:

- `ai-helper-brief`;
- `image-prompt-lab`;
- `video-storyboard-lab`;
- `coin-clicker`;
- `guess-number`;
- `mvp-canvas-to-screen`;
- `mvp-first-scenario`;
- `xss-lab`;
- `local-storage-crash`;
- `defense-script`.

### 7.3. `src/App.tsx`

Правка:

- если `practice.mode === 'mission'`, рендерить `PracticeMissionRunner`;
- иначе оставить текущий `PromptBuilder`/`CodeEditor`;
- не менять маршруты без необходимости.

Псевдологика:

```tsx
{activeModule.practice.mode === 'mission' ? (
  <PracticeMissionRunner ... />
) : activeModule.practice.type === 'prompt' ? (
  <PromptBuilder ... />
) : (
  <CodeEditor ... />
)}
```

### 7.4. `src/components/SlideDeck.tsx`

Добавить CTA на последнем слайде:

- "Перейти к практике";
- ведет на `/practice`;
- сохраняет `selectedWeekId`.

Не добавлять много кнопок. Один primary CTA.

### 7.5. Новый `src/components/PracticeMissionRunner.tsx`

Ответственность:

- выбрать активную mission;
- показать stepper;
- передать starter в IDE;
- запускать checks;
- управлять hint ladder;
- открывать free sandbox;
- создавать artifacts;
- вызывать grading.

Не должен:

- напрямую писать в `localStorage`;
- дублировать код `CodeEditor`;
- быть огромным монолитом без дочерних компонентов.

### 7.6. `src/components/CodeEditor.tsx`

Правки:

- принять optional `starter`;
- принять optional `missionChecks`;
- принять callback `onFilesChange`;
- принять callback `onRunFunctionalTests`;
- не отправлять пустые `staticResults`/`functionalResults` для code-миссий;
- добавить CSP в `srcDoc`;
- добавить `bridgeId/runId` для сообщений iframe.

Оставить:

- снапшоты;
- deploy;
- Agent Manager simulation;
- cheat sheet;
- error analyzer.

### 7.7. `src/lib/grading.ts`

Расширить:

- `MissionCheck`;
- компиляцию `MissionCheck[]` в static/functional checks;
- score cap rules;
- required checks.

Добавить функции:

```ts
runMissionStaticChecks(files, checks)
computeMissionScore({ staticResults, functionalResults, rubricResults, consoleErrors })
```

### 7.8. `src/lib/consoleBridge.ts`

Правки:

- per-run `bridgeId`;
- проверка origin/source;
- timeout на тесты;
- CSP-friendly sandbox doc;
- не принимать test-results без matching run id.

### 7.9. `src/lib/aiGateway.ts`

Добавить task types:

- `coach_hint`;
- `review_diff`;
- `grade_mission`;
- `media_prompt_review`;

Для production:

- schema validation;
- max payload size;
- max output size;
- no trusted client check results;
- score cap на сервере.

### 7.10. `supabase/functions/ai-gateway/index.ts`

P0 до расширения:

- строгая проверка `task`;
- проверка auth для grading/media;
- rate limit учитывать failed requests;
- task-specific limits;
- не доверять `static_results` и `functional_results` как фактам;
- malformed JSON от LLM -> rejected/low score, не pass.

### 7.11. `supabase/migrations`

P0:

- self-signup всегда `student`;
- убрать выбор `teacher` при signup;
- запретить обычному пользователю менять `role`;
- удалить старые permissive policies из первой миграции;
- добавить таблицу/структуру для artifacts, если переносим из localStorage.

### 7.12. `src/components/Auth.tsx`

Правка:

- убрать выбор роли "Куратор" из публичной регистрации;
- demo-login для teacher/admin можно оставить только в mock mode;
- в реальном Supabase teacher/admin назначаются вручную админом.

### 7.13. `src/components/ResourceLibrary.tsx`

Добавить фильтры всех категорий:

- `antigravity`;
- `agents`;
- `git`;
- `mcp`;
- `supabase`;
- `security`.

### 7.14. `src/components/TeacherDashboard.tsx`

Добавить видимость:

- artifacts по студенту;
- последняя mission;
- где студент застрял;
- сколько подсказок использовал;
- deploy links;
- failed checks.

## 8. Каталог тренажеров: точная спецификация

### `prompt-fix`

Дано:

```text
Сделай мне красивое приложение для привычек.
```

Нужно:

- добавить роль;
- уточнить пользователя;
- ограничить стек;
- указать файлы;
- задать DoD;
- запретить лишние функции.

Зачет:

- длина > 250 символов;
- есть Goal/Context/Constraints/DoD;
- есть запрет на бэкенд;
- есть ограничение 3 функции MVP.

### `ai-helper-brief`

Нужно собрать инструкцию для GPT/Gem:

- кто помощник;
- кому помогает;
- какие задачи решает;
- как отвечает;
- что не делает;
- какие данные нельзя просить.

Зачет:

- есть роль;
- есть 3 use cases;
- есть формат ответа;
- есть privacy guardrail.

### `image-prompt-lab`

Нужно улучшить image prompt:

- объект;
- контекст;
- стиль;
- композиция;
- свет/цвет;
- формат;
- запреты.

Зачет:

- промпт применим без дополнительного объяснения;
- нет приватных людей/секретов;
- есть критерий оценки результата.

### `video-storyboard-lab`

Нужно собрать 5 кадров:

1. боль;
2. попытка решить вручную;
3. появление продукта;
4. действие пользователя;
5. результат.

Зачет:

- каждый кадр имеет действие;
- есть длительность/стиль;
- нет расплывчатого "сделай красиво".

### `dom-id-mapper`

Дано: описание экрана.

Нужно:

- выбрать `id` для кнопки;
- выбрать `id` для input;
- выбрать `id` для списка/результата;
- объяснить, зачем JS нужны эти id.

Зачет:

- id короткие;
- id уникальные;
- id совпадают с задачей.

### `coin-clicker`

См. шаг 5. Миссия обязательная.

### `guess-number`

См. шаг 5. Миссия обязательная.

### `diff-audit`

Дано:

- original JS;
- AI modified JS;
- объяснение AI.

Нужно:

- принять/отклонить;
- указать риск;
- при отклонении написать уточняющий промпт.

Зачет:

- решение совпадает с ожидаемым;
- объяснение содержит конкретную строку/поведение.

### `loop-breaker`

Дано:

- 3 неудачных ответа AI;
- console error;
- snapshot до ошибки.

Нужно:

- остановить генерацию;
- откатиться;
- описать reproduce steps;
- попросить объяснение без кода;
- разрешить маленький diff.

### `xss-lab`

Дано:

```js
list.innerHTML = items.map(item => `<li>${item.name}</li>`).join('');
```

Нужно:

- объяснить риск;
- исправить через `escapeHtml` или `textContent`;
- проверить `<img src=x onerror=alert(1)>`.

### `local-storage-crash`

Дано:

- LocalStorage содержит битый JSON.

Нужно:

- обернуть чтение в `try/catch`;
- fallback на `[]`;
- показать понятное состояние.

## 9. Контентная карта

Это не план фаз, а итоговая логика курса.

### Блок A. AI и промпты

Слайды:

- Что такое AI-помощник.
- ChatGPT/Gemini: где полезны.
- GPTs/Gems: персональный бот.
- Prompt anatomy.
- Prompt safety.
- Image prompt anatomy.
- Video storyboard prompt.
- Как критиковать AI-ответ.

Практики:

- AI Helper Brief.
- Prompt Fix.
- Image Prompt Lab.
- Video Prompt Lab.

### Блок B. Веб-модель для новичка

Слайды:

- Проект = папка + файлы.
- HTML/CSS/JS на одной картинке.
- DOM и `id`.
- Событие.
- Состояние.
- Render.
- Console.
- Snapshot.

Практики:

- DOM ID Mapper.
- Coin Clicker.
- Guess Number.

### Блок C. Собственный MVP

Слайды:

- Пользователь и боль.
- Один главный сценарий.
- MVP = 3 функции.
- Что не входит.
- Canvas.
- Brief.
- AGENTS.md.
- Dummy Data First.

Практики:

- Canvas Interview.
- Scenario to Screen.
- First MVP Scenario.

### Блок D. QA и защита

Слайды:

- TEST_PLAN.
- Negative tests.
- XSS.
- LocalStorage crash.
- Red Team.
- Quality Gate.
- Defense script.
- Roadmap.

Практики:

- XSS Lab.
- LocalStorage Crash.
- Red Team Review.
- Final Deploy.
- Defense Script.

## 10. Security contract

Нельзя расширять AI-интерактивность без этих правил.

### Роли

- публичная регистрация создает только `student`;
- `teacher/admin` только через админа;
- пользователь не может обновить собственный `role`.

### RLS

- удалить старые permissive policies;
- проверить, что policies не складываются через `OR` в небезопасный доступ.

### AI Gateway

- ключи только на сервере;
- task allowlist;
- schema validation;
- auth для grading/media;
- task-specific rate limits;
- считать failed requests;
- не логировать секреты;
- ошибки наружу отдавать sanitized.

### iframe

- `sandbox="allow-scripts"` без `allow-same-origin`;
- CSP в `srcDoc`;
- no network by default;
- runId для `postMessage`;
- timeout;
- max code size.

### Media

- сначала только review промптов;
- реальная генерация позже через отдельный endpoint;
- moderation до и после;
- private storage;
- signed URLs;
- TTL.

## 11. Единый цикл внедрения

Делать не "по фазам", а вертикальным срезом: один полный учебный цикл от слайда до оценки.

### Вертикальный срез 1: `coin-clicker`

Сразу реализовать end-to-end:

1. Добавить типы mission.
2. Добавить одну mission в `courseData.ts`.
3. Добавить `PracticeMissionRunner`.
4. Подключить `CodeEditor` со starter.
5. Подключить static checks.
6. Подключить functional iframe check.
7. Добавить hint ladder.
8. Добавить AI review.
9. Создать artifact.
10. Открыть free sandbox после зачета.

Готовность:

- студент открыл слайд;
- нажал "Старт практики";
- прошел кликер;
- получил score;
- сделал deploy;
- продолжил улучшать игру.

### Вертикальный срез 2: `ai-helper-brief`

Сразу реализовать end-to-end:

1. Mission type `prompt`.
2. PromptBuilder starter.
3. Prompt checks.
4. AI feedback.
5. Artifact `AI_HELPER_BRIEF`.
6. Сохранение прогресса.

### Вертикальный срез 3: `mvp-first-scenario`

Сразу реализовать end-to-end:

1. Выбор типа проекта.
2. Canvas.
3. Screen map.
4. Starter files.
5. Первый сценарий.
6. Deploy.
7. AI rubric.

После этих трех срезов масштабировать остальные тренажеры тем же шаблоном.

## 12. Definition of Done

Платформа соответствует ТЗ, если:

- новый студент понимает, что делать после каждого слайда;
- практика открывается как guided mission, а не как длинная инструкция;
- есть минимум один prompt mission, один IDE mission и один MVP mission end-to-end;
- AI-подсказки ступенчатые;
- AI-diff не применяется без approve;
- code mission имеет static и functional checks;
- score не может стать высоким без проверок;
- после зачета открывается свободная песочница;
- каждый важный шаг создает artifact;
- куратор видит artifacts, deploys и failed checks;
- security P0 закрыты до production;
- 4-недельное позиционирование не конфликтует с "уровнем 2".

## 13. Четкий список первых правок

1. `ModuleTimeline`: заменить "8-недельная программа" на "4-недельный базовый курс".
2. `index.html`: убрать обещание Weeks 5-8 из description или назвать их "уровень 2 скоро".
3. `ResourceLibrary`: добавить все категории фильтров.
4. `Auth`: убрать выбор роли куратора из публичной регистрации.
5. `types.ts`: добавить mission/artifact типы optional.
6. `courseData.ts`: добавить одну mission `coin-clicker`.
7. `App.tsx`: включить `PracticeMissionRunner` при `practice.mode === 'mission'`.
8. `SlideDeck`: добавить CTA "Старт практики" на последнем слайде.
9. `CodeEditor`: принять starter/checks/callbacks.
10. `grading.ts`: добавить score caps и mission checks.
11. `consoleBridge`: добавить runId/CSP/timeout hardening.
12. `aiGateway`: добавить task `grade_mission` и schema validation.
13. Supabase migrations: закрыть role escalation и старые permissive policies.

## 14. Что сознательно не делать

- Не делать все тренажеры сразу до первого вертикального среза.
- Не добавлять новые зависимости.
- Не делать свободный AI-chat без рамок.
- Не переносить весь курс в новую схему одним большим diff.
- Не включать реальную генерацию видео/изображений до quota/moderation/storage.
- Не требовать от новичка GitHub/CLI до понимания snapshot/diff/deploy.
- Не расширять курс до 8 недель, пока базовый путь не проходит без путаницы.

# ТЗ v3: Centras CodeAI как вайбовая обучающая песочница

## 0. Цель

Сделать Centras CodeAI не библиотекой слайдов, а управляемой песочницей для
новичков без программистского бэкграунда.

Главная формула платформы:

```text
понял идею
-> сразу попробовал
-> получил подсказку
-> исправил
-> увидел результат
-> сохранил артефакт
-> получил проверку
-> продолжил свой MVP
```

Студент не должен думать, куда идти дальше. После каждого экрана у него есть
одно понятное действие, один ожидаемый результат и один способ проверить себя.

Преподаватель должен видеть не только итоговую сдачу, а весь учебный след:
где студент находится, где застрял, какие подсказки открыл, что написал в
prompt, какие проверки упали, какой `/preview/:id` можно открыть.

## 1. Аудит текущего состояния

### 1.1. Факты из проекта

- Стек: React 19, TypeScript, Vite, React Router, Zustand, Supabase, Monaco,
  Lucide.
- Контент загружается через `src/lib/contentService.ts`: сначала Supabase,
  затем fallback на `src/content/courseData.ts`.
- В курсе сейчас 4 модуля:
  - неделя 1: 24 слайда, prompt-практика, 5 вопросов quiz;
  - неделя 2: 24 слайда, prompt-практика, 5 вопросов quiz;
  - неделя 3: 26 слайдов, `mode: mission`, 2 missions, 5 вопросов quiz;
  - неделя 4: 20 слайдов, code-практика, 5 вопросов quiz.
- Типы уже поддерживают `PracticeMission`, `MissionStep`, `MissionCheck`,
  `MissionAgentInstruction`.
- `PracticeMissionRunner.tsx` уже существует и показывает stepper, hints,
  agent instructions и встроенный `CodeEditor`.
- `CodeEditor.tsx` уже умеет:
  - Monaco для HTML/CSS/JS;
  - Live Preview в iframe;
  - `sandbox="allow-scripts"`;
  - снапшоты;
  - внутренний деплой `/preview/:id`;
  - симуляцию Agent Manager;
  - prompt cheat sheet;
  - static/functional mission checks;
  - отправку на AI-проверку.
- `PromptBuilder.tsx` уже умеет собирать prompt из Goal, Context,
  Constraints, DoD и отправлять на проверку.
- `ResourceLibrary.tsx` показывает ресурсы, но фильтры UI сейчас покрывают
  только `docs`, `tools`, `templates`, `articles`, хотя данные уже содержат
  `antigravity`, `agents`, `git`, `mcp`, `supabase`, `security`.
- `TeacherDashboard.tsx` уже видит студентов, submissions, квоты и локальные
  деплои, но не видит живой шаг студента, stuck-state, hint usage, artifacts,
  запросы помощи и совместную работу.
- `Navbar.tsx` сейчас показывает много верхних пунктов:
  `Главная`, `Программа`, `Слайды`, `Практика`, `Ресурсы`, `Онбординг`.

### 1.2. Главные разрывы

1. Слайды и практика связаны маршрутом, но не связаны учебным сценарием.
   Нужна логика: `слайд -> мини-интерактив -> mission -> artifact`.
2. В навигации слишком много равноправных кнопок для новичка.
3. Недели 1, 2 и 4 пока не mission-first, хотя типы и runner уже готовы.
4. Ресурсы не привязаны к неделе и шагу.
5. AI Coach пока разбросан: есть проверка, подсказки, анализатор ошибок,
   cheat sheet, но нет единого правого помощника "что делать сейчас".
6. Teacher Dashboard пока кабинет проверки, а не пульт сопровождения.
7. Нет портфолио артефактов ученика: prompt, canvas, screen map, snapshots,
   deploys, checks, final defense.
8. Нет безопасного live-help сценария, где преподаватель может подключиться
   к текущей работе ученика.
9. Design-to-code сценарий через Stitch/Figma/аналог пока не встроен в
   учебный путь.

## 2. Принципы продукта

### 2.1. Для ученика

- Не "изучать программирование", а собирать понятные маленькие результаты.
- Каждый термин сразу привязан к действию:
  - DOM id -> "по этому имени JS находит кнопку";
  - state -> "это память экрана";
  - render -> "перерисовать список после изменения";
  - diff -> "что агент предлагает поменять";
  - deploy -> "ссылка, которую можно показать".
- Главная эмоция: "я понимаю следующий шаг".

### 2.2. Для преподавателя

- Видеть процесс, а не только финальную сдачу.
- Подключаться к проблемному месту без просьбы "скинь экран".
- Давать помощь как patch/comment, а не переписывать всё за ученика.
- Быстро находить тех, кто:
  - не начал;
  - застрял на шаге;
  - открыл 3 подсказки;
  - получил красные checks;
  - не сделал deploy;
  - раздул MVP.

### 2.3. Для реализации

- Не добавлять зависимости без необходимости.
- Использовать текущие типы и компоненты как базу.
- Расширять вертикальными срезами, а не одним большим переписыванием.
- Сначала deterministic checks, потом AI review.
- AI-chat только в рамке текущей mission/step, не свободная болталка.
- Student code всегда untrusted.

## 3. Информационная архитектура

### 3.1. Целевая верхняя навигация

Для студента:

```text
Учиться | Песочница | Ресурсы
```

Дополнительно справа:

```text
Прогресс | Тема | Профиль
```

Для преподавателя:

```text
Учиться | Ресурсы | Куратор
```

### 3.2. Что убрать из верхнего меню

- `Программа` не нужна как отдельный постоянный пункт. Она становится
  частью экрана `Учиться`.
- `Слайды` и `Практика` не должны быть двумя разными направлениями.
  Для новичка это один поток.
- `Онбординг` не должен висеть всегда. После прохождения он доступен как
  "Повторить вводный тур" из профиля или ресурсов.

### 3.3. Маршруты без рискованного переписывания

Первый этап не требует ломать роуты:

- `/program` можно визуально спрятать из nav, но оставить рабочим.
- `/slides` и `/practice` можно оставить как технические маршруты.
- Главный CTA `Учиться` ведет в текущую неделю и сам выбирает нужный экран:
  - если tour не пройден: `/tour`;
  - если неделя открыта и слайды не завершены: `/slides`;
  - если слайды завершены: `/practice`;
  - если практика сдана: следующая неделя.

Позже можно ввести единый маршрут:

```text
/learn/week/:weekId
```

Но это не первый diff.

## 4. Главный учебный поток

### 4.1. Состояния недели

Каждая неделя должна иметь состояния:

1. `locked` - закрыта куратором.
2. `intro` - цель недели, артефакты, длительность.
3. `slides` - короткие слайды с микропроверками.
4. `checkpoint` - 1-3 минуты действия после блока слайдов.
5. `mission` - guided practice.
6. `review` - deterministic checks + AI feedback.
7. `homework` - сдача одного или нескольких артефактов.
8. `sandbox` - свободная доработка после зачета.
9. `done` - неделя завершена, следующий шаг понятен.

### 4.2. Единый цикл экрана

```text
Объяснение
-> Попробуй
-> Проверь
-> Подсказка
-> Исправь
-> Сохрани
```

На экране всегда видны:

- текущая неделя;
- текущий шаг;
- главный action button;
- короткий критерий успеха;
- кнопка подсказки;
- кнопка "Позвать куратора";
- статус сохранения.

## 5. Экран "Учиться"

### 5.1. Назначение

Это основной экран студента. Он заменяет ощущение, что есть отдельные
"слайды", "практика", "quiz", "ресурсы".

### 5.2. Layout desktop

```text
┌─────────────────────────────────────────────────────────────┐
│ Top nav: Учиться | Песочница | Ресурсы                      │
├───────────────┬───────────────────────────────┬─────────────┤
│ Week rail     │ Main learning surface          │ Coach rail  │
│ - Неделя 1    │ - slide / trainer / editor     │ - AI Coach  │
│ - Неделя 2    │ - current task                 │ - Hints     │
│ - Неделя 3    │ - checks                       │ - Resources │
│ - Неделя 4    │ - artifact                     │ - Help      │
└───────────────┴───────────────────────────────┴─────────────┘
```

### 5.3. Layout mobile

Mobile поддерживает:

- чтение слайдов;
- prompt labs;
- quiz;
- ресурсы;
- просмотр feedback.

IDE missions можно честно маркировать как desktop-first:

```text
Для этой миссии нужен экран от 1024px. Сейчас можно прочитать шаги,
посмотреть пример и сохранить prompt, а код лучше выполнить на ноутбуке.
```

### 5.4. Главные кнопки

- `Продолжить` - ведет к следующему обязательному действию.
- `Проверить шаг` - запускает checks текущего шага.
- `Подсказка` - открывает следующий уровень hint ladder.
- `Спросить AI Coach` - открывает строго ограниченный режим помощи.
- `Позвать куратора` - создает help request.
- `Сохранить артефакт` - пишет prompt/canvas/deploy/check result.
- `Сдать ДЗ` - отправляет на grading.

## 6. Слайды как интерактивная лента

### 6.1. Новое правило слайдов

Каждые 3-5 слайдов должны приводить к микродействию.

Примеры:

- выбрать лучший prompt;
- исправить плохой prompt;
- сопоставить HTML/CSS/JS;
- отметить, какой diff опасен;
- выбрать, что НЕ входит в MVP;
- написать один DOM id;
- найти XSS-строку;
- выбрать правильное сообщение snapshot/commit.

### 6.2. CTA последнего слайда

На последнем слайде недели не должно быть тупика.

Кнопки:

- `Начать практику недели`;
- `Открыть ресурсы недели`;
- `Скачать/скопировать шаблон`, если применимо.

### 6.3. Slide checkpoint type

В будущем можно добавить новый тип:

```ts
type SlideCheckpoint =
  | 'single-choice'
  | 'prompt-rewrite'
  | 'diff-choice'
  | 'match'
  | 'mini-input';
```

Но первый этап можно сделать без изменения типов: использовать существующий
`interactive` slide и отдельный компонент checkpoint по `slide.id`.

## 7. Mission Workspace

### 7.1. Цель

Mission Workspace должен быть местом, где студент не теряется:
один шаг, один action, одна проверка.

### 7.2. Текущая база

`PracticeMissionRunner.tsx` уже реализует:

- mission header;
- stepper;
- active step;
- hint ladder;
- agent instructions;
- встроенный CodeEditor.

Это правильная база. Ее нужно масштабировать на недели 1, 2 и 4.

### 7.3. Целевой layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Mission header: цель, артефакт, критерии                    │
├──────────────────┬───────────────────────────┬───────────────┤
│ Step rail        │ Work surface              │ Feedback rail │
│ 1. Что сделать   │ Prompt / Monaco / Diff    │ Checks        │
│ 2. Где править   │ Live Preview              │ AI Coach      │
│ 3. Проверка      │ Artifact preview          │ Resources     │
│ Hints            │                           │ Teacher help  │
└──────────────────┴───────────────────────────┴───────────────┘
```

### 7.4. Состояния mission

- `not-started` - цель и кнопка `Начать`.
- `in-progress` - текущий шаг активен.
- `checking` - checks выполняются.
- `failed` - конкретные failed checks + next fix.
- `hinted` - открыт hint level 1/2/3.
- `passed-step` - шаг закрыт.
- `passed-mission` - открыт artifact/save/deploy.
- `submitted` - отправлено на AI/teacher review.
- `approved` - открыта свободная песочница.

### 7.5. Правило шага

Каждый шаг mission обязан иметь:

- `target`: где работать (`prompt`, `html`, `css`, `js`, `preview`, `deploy`);
- `instruction`: короткое действие;
- `expected`: что должно измениться;
- `checkIds`: чем проверяется;
- `hints`: 3 уровня;
- `doneText`: текст успеха.

## 8. AI Coach

### 8.1. Назначение

AI Coach не должен заменять преподавателя и не должен писать весь проект.
Он направляет внимание ученика в текущем шаге.

### 8.2. Режимы

1. `Объясни` - простое объяснение текущего понятия.
2. `Дай подсказку` - hint без готового решения.
3. `Проверь prompt` - оценка структуры prompt.
4. `Проверь diff` - принять/отклонить изменение.
5. `Разбери ошибку` - console/error -> причина -> следующий шаг.
6. `Сделай проще` - переписать инструкцию человеческим языком.

### 8.3. Контекст AI Coach

Каждый запрос должен включать:

- `weekId`;
- `missionId`;
- `stepId`;
- текущий target;
- текст задания;
- текущие files или prompt;
- результаты checks;
- открытый hint level.

Запрос не должен включать:

- secrets;
- токены;
- приватные данные;
- полную историю чата без необходимости.

### 8.4. Подсветка внимания

Для "нажми сюда" и "напиши сюда" нужен не свободный текст, а структурированная
подсказка:

```ts
interface CoachCue {
  targetSelector: string;
  title: string;
  body: string;
  actionLabel?: string;
}
```

Пример:

```text
targetSelector: "#prompt-goal"
title: "Начни с цели"
body: "Напиши, какой экран или фичу должен получить пользователь."
actionLabel: "Заполнить Goal"
```

Первый этап: подсветка внутри собственных компонентов платформы.
Не подсвечивать произвольный student HTML внутри iframe без отдельного
безопасного слоя.

### 8.5. Ответ AI Coach

Формат:

```text
Похоже, ты сейчас на шаге ...
Проблема: ...
Сделай одно действие: ...
Проверь так: ...
```

Никаких длинных лекций по умолчанию.

## 9. Teacher Dashboard и live-help

### 9.1. Цель

Преподаватель должен работать как куратор в интерактивной лаборатории:
видеть прогресс, быстро подключаться и помогать точечно.

### 9.2. Новые панели

#### Панель "Кто застрял"

Показывает:

- студент;
- неделя;
- mission;
- step;
- последний failed check;
- сколько подсказок открыл;
- сколько минут без прогресса;
- кнопка `Открыть работу`;
- кнопка `Написать комментарий`;
- кнопка `Подключиться`.

#### Панель "Артефакты"

По каждому студенту:

- prompts;
- Vibe Coding Canvas;
- Project Brief;
- Screen Map;
- snapshots;
- `/preview/:id`;
- AI review;
- teacher comments;
- defense script.

#### Панель "Живая помощь"

Фазы внедрения:

1. `Async help`: студент жмет `Позвать куратора`, преподаватель видит
   текущие файлы/prompt/checks и оставляет комментарий.
2. `Observe mode`: преподаватель видит актуальное состояние sandbox почти
   в реальном времени, но не редактирует.
3. `Patch proposal`: преподаватель предлагает diff/comment, студент нажимает
   `Принять` или `Отклонить`.
4. `Co-edit`: совместное редактирование через Supabase Realtime, только после
   проверки безопасности и конфликтов.

Первый релиз должен ограничиться фазами 1-2.

### 9.3. Что не делать сразу

- Не давать преподавателю молча менять код ученика без явного статуса.
- Не делать полноценный Google Docs-style co-edit первым этапом.
- Не писать student code в общую таблицу без RLS.
- Не хранить бесконечные snapshots без квот.

## 10. Ресурсы по неделям

### 10.1. Проблема сейчас

Данные ресурсов богаче, чем UI. В `courseData.ts` есть категории:

```text
agents, antigravity, docs, git, mcp, security, supabase, templates, tools
```

Но `ResourceLibrary.tsx` показывает фильтры только:

```text
Все, Документация, Инструменты, Шаблоны, Статьи
```

### 10.2. Целевая модель

Добавить к ресурсу необязательные поля:

```ts
interface ResourceLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: ResourceCategory;
  weekIds?: number[];
  missionIds?: string[];
  level?: 'required' | 'recommended' | 'advanced';
}
```

Первый этап можно сделать без изменения данных:

- вывести все категории из фактических `resourceLinks`;
- добавить фильтр `Неделя`;
- вручную сопоставить ресурсы по id внутри компонента или helper.

### 10.3. Карта ресурсов

#### Неделя 1: AI-грамотность и prompts

Обязательные:

- Prompt Engineering Guide;
- MDN как справочник, не как учебник для чтения целиком;
- шаблон Vibe Coding Canvas.

Рекомендуемые:

- ChatGPT/Gemini/GPTs/Gems материалы, если добавлены;
- image/video prompt examples.

#### Неделя 2: MVP, экран, контекст, design-to-code

Обязательные:

- Project Brief template;
- AGENTS.md template;
- GitHub Desktop или beginner Git guide;
- Stitch/Figma/design-to-code инструкция в ручном режиме.

Рекомендуемые:

- Conventional Commits только в минимальном виде;
- `.gitignore` generator;
- Antigravity intro.

#### Неделя 3: IDE, агенты, первая сборка

Обязательные:

- Antigravity official/start resources;
- Agent workflow;
- prompt cheat sheet;
- DOM/events/state notes.

Рекомендуемые:

- Cursor/Claude/Codex/Gemini CLI как альтернативы, не как обязательный путь.

#### Неделя 4: QA, security, deploy, defense

Обязательные:

- TEST_PLAN template;
- OWASP Top 10;
- Supabase RLS basics;
- internal deploy guide.

Рекомендуемые:

- Snyk Advisor;
- Netlify/Vercel/GitHub Pages как "после курса".

## 11. Недельная программа v3

### Неделя 1. AI-мышление, prompt и личный помощник

Цель: ученик понимает, что AI - не магия и не исполнитель "сделай всё", а
партнер, которому нужен контекст.

Ключевые понятия:

- роль;
- цель;
- контекст;
- ограничения;
- формат ответа;
- DoD;
- приватность;
- критика AI-ответа.

Интерактивы:

1. `prompt-anatomy`: разобрать prompt на блоки.
2. `prompt-fix`: улучшить слабый prompt.
3. `ai-helper-brief`: собрать инструкцию для личного GPT/Gem.
4. `image-prompt-lab`: написать prompt для обложки/hero своего проекта.
5. `video-storyboard-lab`: собрать 5 кадров demo/pitch.

Домашние задания:

- `AI_HELPER_BRIEF`;
- 2 image prompts с самокритикой;
- 1 video storyboard prompt;
- первая версия идеи MVP.

Артефакты:

- prompt object;
- helper brief;
- media prompt pack;
- idea shortlist.

### Неделя 2. MVP, экран, контекст и design-to-code

Цель: ученик выбирает реалистичный MVP и переводит идею в первый экран.

Это неделя, где MVP должен быть определен. Не позже.

Ключевые понятия:

- пользователь;
- боль;
- один главный сценарий;
- 3 функции MVP;
- что НЕ входит;
- screen map;
- DOM id;
- Project Brief;
- AGENTS.md;
- Git как "история/snapshot", не как набор команд ради команд.

Интерактивы:

1. `mvp-scope-cutter`: выкинуть лишние функции из раздутой идеи.
2. `canvas-interview`: AI задает вопросы и собирает Vibe Coding Canvas.
3. `screen-map`: описать экран через элементы и действия.
4. `dom-id-mapper`: дать понятные id кнопке, input, списку, статусу.
5. `stitch-design-lab`: внешний design-to-code цикл в ручном режиме.
6. `git-minimum`: выбрать правильное сообщение snapshot/commit.

Stitch/design-to-code сценарий:

```text
1. Ученик пишет prompt для интерфейса.
2. Открывает Stitch/Figma/аналог во внешнем инструменте.
3. Генерирует 2-3 варианта первого экрана.
4. Выбирает один вариант.
5. Возвращает в платформу:
   - ссылку или скриншот;
   - описание, что понравилось;
   - какие блоки переносим;
   - какой HTML/CSS просим агента собрать.
6. AI Coach оценивает не красоту, а соответствие MVP-сценарию.
```

Важно: в первом релизе не делать API-интеграцию со Stitch. Достаточно
ручного "скопируй prompt -> верни результат -> разбери".

Домашние задания:

- Vibe Coding Canvas;
- Project Brief;
- AGENTS.md для личного проекта;
- Screen Element Map;
- дизайн-концепт первого экрана.

Артефакты:

- `VIBE_CODING_CANVAS`;
- `PROJECT_BRIEF`;
- `AGENTS_MD_DRAFT`;
- `SCREEN_ELEMENT_MAP`;
- `DESIGN_PROMPT_AND_REVIEW`.

### Неделя 3. IDE, агенты и первая работающая версия

Цель: ученик впервые строит маленький рабочий интерфейс и начинает свой MVP.

Ключевые понятия:

- HTML/CSS/JS на одной картинке;
- DOM;
- event;
- state;
- render;
- console;
- diff;
- snapshot;
- internal deploy.

Интерактивы:

1. `coin-clicker`: оживить кнопку.
2. `guess-number`: маленькая игра с input/state/render.
3. `diff-audit`: принять или отклонить изменение AI.
4. `loop-breaker`: остановить неудачный цикл исправлений.
5. `mvp-first-scenario`: перенести свой screen map в первый рабочий сценарий.

Домашние задания:

- мини-игра с deploy;
- первый сценарий личного MVP;
- короткий отчет: какие prompts сработали, какие нет.

Артефакты:

- snapshot;
- `/preview/:id`;
- mission score;
- MVP scenario build.

### Неделя 4. QA, безопасность, деплой и защита

Цель: ученик доводит MVP до демонстрации и понимает базовые риски.

Ключевые понятия:

- TEST_PLAN;
- happy path;
- negative tests;
- XSS;
- LocalStorage crash;
- secrets;
- Quality Gate;
- defense pitch;
- roadmap.

Интерактивы:

1. `xss-lab`: найти и исправить unsafe `innerHTML`.
2. `local-storage-crash`: пережить битый JSON.
3. `red-team-review`: AI ищет edge cases, ученик выбирает важные.
4. `quality-gate`: пройти checks перед сдачей.
5. `defense-script`: собрать 3-минутную речь.

Домашние задания:

- финальный `/preview/:id`;
- TEST_PLAN;
- security checklist;
- defense script;
- roadmap на 3 следующих улучшения.

Артефакты:

- final deploy;
- test plan;
- AI/teacher review;
- defense script;
- roadmap.

## 12. Каталог тренажеров

| Trainer | Где | Что делает | Проверка |
| --- | --- | --- | --- |
| `prompt-anatomy` | Week 1 | Разложить prompt на blocks | Все blocks заполнены |
| `prompt-fix` | Week 1 | Улучшить слабый prompt | Есть Goal/Context/Constraints/DoD |
| `ai-helper-brief` | Week 1 | Создать инструкцию помощника | Роль, задачи, запреты, формат |
| `image-prompt-lab` | Week 1 | Написать media prompt | Объект, стиль, формат, запреты |
| `video-storyboard-lab` | Week 1 | 5 кадров demo | Каждый кадр имеет действие |
| `mvp-scope-cutter` | Week 2 | Срезать раздутый MVP | Не больше 3 функций |
| `canvas-interview` | Week 2 | Собрать canvas | Пользователь, боль, сценарий |
| `screen-map` | Week 2 | Превратить идею в экран | Есть элементы и действия |
| `dom-id-mapper` | Week 2 | Назначить id | id короткие и используются |
| `stitch-design-lab` | Week 2 | Prompt -> дизайн -> review | Дизайн связан с MVP |
| `git-minimum` | Week 2 | Понять snapshot/commit | Верный message и когда сохранять |
| `coin-clicker` | Week 3 | Кнопка меняет счетчик | Functional click test |
| `guess-number` | Week 3 | Input/state/render | Functional scenario |
| `diff-audit` | Week 3 | Проверить AI diff | Решение + аргумент |
| `loop-breaker` | Week 3 | Остановить ошибочный цикл | Reproduce + rollback |
| `mvp-first-scenario` | Week 3 | Первый сценарий MVP | Preview works |
| `xss-lab` | Week 4 | Закрыть XSS | Payload не исполняется |
| `local-storage-crash` | Week 4 | Safe parse JSON | App не падает |
| `red-team-review` | Week 4 | Найти риски | 3 риска + fix plan |
| `quality-gate` | Week 4 | Финальная проверка | Checks pass |
| `defense-script` | Week 4 | Речь защиты | 3 минуты, проблема, demo |

## 13. Данные и типы

### 13.1. LearningArtifact

Нужен единый объект для портфолио прогресса.

```ts
export type ArtifactType =
  | 'prompt'
  | 'canvas'
  | 'brief'
  | 'agents-md'
  | 'screen-map'
  | 'design-review'
  | 'snapshot'
  | 'deploy'
  | 'test-plan'
  | 'defense-script';

export interface LearningArtifact {
  id: string;
  studentId: string;
  weekId: number;
  missionId?: string;
  type: ArtifactType;
  title: string;
  payload: unknown;
  score?: number;
  teacherComment?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 13.2. MissionProgress

```ts
export interface MissionProgress {
  studentId: string;
  weekId: number;
  missionId: string;
  stepId: string;
  status: 'not-started' | 'in-progress' | 'stuck' | 'passed' | 'submitted';
  hintLevel: number;
  failedCheckIds: string[];
  lastActivityAt: string;
}
```

### 13.3. HelpRequest

```ts
export interface HelpRequest {
  id: string;
  studentId: string;
  weekId: number;
  missionId?: string;
  stepId?: string;
  message: string;
  status: 'open' | 'viewed' | 'answered' | 'closed';
  snapshotRef?: string;
  teacherId?: string;
  teacherComment?: string;
  createdAt: string;
}
```

### 13.4. Resource week binding

Добавить позже:

```ts
weekIds?: number[];
missionIds?: string[];
level?: 'required' | 'recommended' | 'advanced';
```

### 13.5. Storage

Demo mode:

- можно временно использовать localStorage через отдельные service-функции;
- не обращаться к localStorage напрямую из компонентов.

Production:

- Supabase tables;
- RLS по `studentId`;
- teacher/admin read by cohort;
- audit fields;
- quotas для snapshots/deploys/media.

## 14. AI Gateway и безопасность

### 14.1. Task allowlist

Разрешенные задачи:

- `lint_prompt`;
- `grade_submission`;
- `grade_mission`;
- `coach_hint`;
- `coach_explain`;
- `coach_error`;
- `review_diff`;
- `review_design_prompt`;
- `red_team_review`.

### 14.2. Серверные проверки

Для каждого AI-запроса:

- auth или anon quota;
- `weekId` существует;
- `missionId` существует;
- payload size limit;
- task schema validation;
- role validation;
- rate limit;
- sanitized errors.

### 14.3. Score rules

- Статика и functional checks идут до LLM.
- Если required functional checks не пройдены, высокий score невозможен.
- LLM review объясняет и оценивает, но не заменяет deterministic checks.
- В production клиент не должен сам себе ставить `approved`.

### 14.4. iframe

Сохранять:

```html
sandbox="allow-scripts"
```

Не добавлять `allow-same-origin` без отдельного security review.

Дополнительно:

- ограничить размер HTML/CSS/JS;
- timeout functional tests;
- runId для сообщений;
- не доверять `postMessage` без bridge id;
- не логировать secrets.

## 15. Design-to-code / Stitch Lab

### 15.1. Зачем

Новичку сложно представить экран. Design-to-code lab дает быстрый мост:

```text
идея -> prompt дизайна -> визуальный вариант -> screen map -> HTML/CSS
```

### 15.2. Первый релиз

Без API-интеграции.

Экран в платформе:

- поле `Prompt для дизайна`;
- чек-лист качества prompt;
- кнопка `Скопировать prompt`;
- инструкция `Откройте Stitch/Figma/аналог`;
- поле `Что получилось`;
- поле `Что переносим в MVP`;
- upload/link позже, сначала можно textarea + external URL;
- AI review по критериям MVP.

### 15.3. Критерии проверки

AI Coach оценивает:

- есть ли один главный экран;
- видна ли главная боль/задача;
- нет ли лишних функций;
- понятны ли кнопки;
- можно ли собрать это в HTML/CSS/JS за курс;
- какие блоки переносить первыми.

### 15.4. Что не делать

- Не обещать автоматический импорт Stitch в код, пока нет подтвержденного API.
- Не оценивать "красиво/некрасиво" без UX-критериев.
- Не превращать неделю 2 в курс дизайна. Это быстрый мост к MVP.

## 16. Итерации внедрения

### Итерация 1. Убрать навигационный шум и связать слайды с практикой

Файлы:

- `src/components/Navbar.tsx`;
- `src/components/ModuleTimeline.tsx`;
- `src/components/SlideDeck.tsx`;
- `src/App.tsx`.

Изменения:

- студент видит `Учиться`, `Песочница`, `Ресурсы`;
- onboarding убрать из постоянного nav;
- `ModuleTimeline` заменить "8-недельная" на "4-недельный базовый курс";
- на последнем слайде добавить CTA `Начать практику`;
- сохранить старые маршруты рабочими.

Acceptance:

- все маршруты открываются;
- студент понимает следующий шаг;
- нет удаления контента.

### Итерация 2. Ресурсы по неделям

Файлы:

- `src/components/ResourceLibrary.tsx`;
- `src/content/courseData.ts` только если подтверждаем content-change;
- возможно `src/types.ts`.

Изменения:

- показать все фактические категории;
- добавить фильтр `Неделя`;
- добавить уровни `Обязательные`, `Рекомендуемые`, `Продвинутые`;
- на экране недели показывать 3-5 релевантных ресурсов.

Acceptance:

- категории из `ResourceCategory` не теряются;
- неделя 1-4 имеют свой набор ресурсов;
- поиск продолжает работать.

### Итерация 3. Mission-first для недели 1

Файлы:

- `src/content/courseData.ts`;
- `src/components/PracticeMissionRunner.tsx`;
- `src/components/PromptBuilder.tsx`;
- `src/lib/grading.ts`.

Изменения:

- добавить prompt missions:
  - `prompt-fix`;
  - `ai-helper-brief`;
  - `image-prompt-lab`;
- PromptBuilder должен уметь работать как mission surface;
- checks для prompt: длина, blocks, constraints, forbidden secrets.

Acceptance:

- неделя 1 не просто prompt-практика, а guided mission;
- AI review получает staticResults;
- студент сохраняет artifact.

### Итерация 4. Неделя 2 как MVP decision week

Файлы:

- `src/content/courseData.ts`;
- новый/расширенный trainer component для canvas/screen map;
- `ResourceLibrary`;
- artifact service.

Изменения:

- перенести акцент недели 2 с "Git/GitHub" на "MVP + экран + контекст";
- Git оставить минимальным блоком: snapshot, commit message, backup;
- добавить `mvp-scope-cutter`, `screen-map`, `dom-id-mapper`;
- добавить `stitch-design-lab` в ручном режиме.

Acceptance:

- у студента к концу недели 2 есть выбранный MVP;
- есть `PROJECT_BRIEF`;
- есть `SCREEN_ELEMENT_MAP`;
- Git не перегружает новичка.

### Итерация 5. Неделя 3: расширить IDE missions

Файлы:

- `src/content/courseData.ts`;
- `PracticeMissionRunner`;
- `CodeEditor`;
- `consoleBridge`.

Изменения:

- текущий `coin-clicker` оставить как первый вертикальный срез;
- добавить `guess-number`;
- добавить `diff-audit`;
- добавить `loop-breaker`;
- связать `mvp-first-scenario` с артефактами недели 2.

Acceptance:

- есть минимум 3 guided code missions;
- каждый code trainer имеет static + functional checks;
- student deploy создается после passing checks.

### Итерация 6. Неделя 4: QA/security/final deploy

Файлы:

- `src/content/courseData.ts`;
- `grading.ts`;
- `CodeEditor`;
- `TeacherDashboard`.

Изменения:

- добавить `xss-lab`;
- добавить `local-storage-crash`;
- добавить `red-team-review`;
- добавить `quality-gate`;
- финальный deploy и defense script как обязательные artifacts.

Acceptance:

- XSS payload не исполняется;
- битый JSON не ломает приложение;
- финальная сдача содержит deploy, TEST_PLAN, defense script.

### Итерация 7. AI Coach как правый rail

Файлы:

- новый `src/components/AICoachPanel.tsx`;
- `aiGateway.ts`;
- `PracticeMissionRunner`;
- `CodeEditor`;
- `PromptBuilder`.

Изменения:

- собрать hints, error analyzer, prompt suggestions и review в единый rail;
- добавить modes;
- добавить `CoachCue`;
- AI replies привязать к step/checks.

Acceptance:

- AI Coach не отвечает вне контекста mission;
- подсказки короткие;
- есть `Explain`, `Hint`, `Review`, `Error`.

### Итерация 8. Teacher stuck queue и help request

Файлы:

- `TeacherDashboard.tsx`;
- new services for progress/help;
- Supabase migration позже.

Изменения:

- сохранять `MissionProgress`;
- кнопка `Позвать куратора`;
- teacher видит stuck queue;
- teacher открывает current files/prompt/checks;
- teacher оставляет comment.

Acceptance:

- преподаватель видит, кто застрял;
- ученик получает комментарий в своем workspace;
- RLS не дает студентам видеть чужие данные.

### Итерация 9. Observe mode

Файлы:

- Supabase Realtime channel;
- student workspace presence;
- teacher dashboard session view.

Изменения:

- студент явно включает help session;
- teacher видит readonly current prompt/files/checks;
- teacher может предложить patch/comment;
- student принимает или отклоняет.

Acceptance:

- нет скрытого редактирования;
- есть журнал teacher actions;
- конфликтные изменения не применяются автоматически.

## 17. Кнопки и микрокопи

### 17.1. Основные кнопки ученика

- `Продолжить` - следующий обязательный шаг.
- `Начать миссию` - старт guided practice.
- `Проверить шаг` - локальные checks.
- `Подсказка` - следующий hint.
- `Объясни проще` - AI Coach explain.
- `Проверить prompt` - prompt rubric.
- `Проверить diff` - diff audit.
- `Запуск` - run preview.
- `Снапшот` - сохранить состояние.
- `Откат` - выбрать snapshot.
- `Внутренний деплой` - создать `/preview/:id`.
- `Позвать куратора` - help request.
- `Сдать ДЗ` - итоговая проверка.

### 17.2. Основные кнопки преподавателя

- `Открыть работу`;
- `Открыть preview`;
- `Ответить`;
- `Подключиться`;
- `Предложить правку`;
- `Попросить повторить`;
- `Зачесть вручную`;
- `Расширить квоту`;
- `Закрыть запрос`.

### 17.3. Запрещенная микрокопи

Не использовать:

- "просто";
- "очевидно";
- "как обычно";
- "напишите код";
- "разберитесь";
- "сделайте красиво".

Использовать:

- "Сделай одно действие";
- "Ожидаемый результат";
- "Проверь так";
- "Если не получилось";
- "Сохрани артефакт";
- "Попроси AI объяснить без кода".

## 18. Definition of Done

Платформа соответствует этому ТЗ, если:

- студент проходит неделю как единый поток, а не прыгает между разделами;
- каждые 3-5 слайдов есть микродействие;
- недели 1-4 имеют guided missions;
- неделя 2 фиксирует MVP и первый экран;
- неделя 3 продолжает личный MVP, а не живет отдельно;
- ресурсы фильтруются по неделе и категории;
- AI Coach работает в контексте шага;
- hints ступенчатые;
- code missions имеют static и functional checks;
- high score невозможен без required checks;
- артефакты сохраняются;
- Teacher Dashboard показывает stuck queue и artifacts;
- live help начинается с безопасного observe/comment режима;
- iframe остается без `allow-same-origin`;
- build и lint проходят.

## 19. Первый список задач

1. `Navbar.tsx`: сократить student nav до `Учиться`, `Песочница`, `Ресурсы`.
2. `ModuleTimeline.tsx`: заменить "8-недельная" на "4-недельный базовый курс".
3. `SlideDeck.tsx`: добавить CTA `Начать практику` на последнем слайде.
4. `ResourceLibrary.tsx`: вывести все категории и фильтр по неделе.
5. `types.ts`: спроектировать optional поля для resources/artifacts без
   ломки существующих данных.
6. `courseData.ts`: после отдельного подтверждения content-change добавить
   Week 1 prompt missions.
7. `PromptBuilder.tsx`: поддержать mission mode и static prompt checks.
8. `PracticeMissionRunner.tsx`: показывать resources/current artifact.
9. `CodeEditor.tsx`: вынести AI Coach rail из отдельных панелей.
10. `TeacherDashboard.tsx`: добавить stuck queue и help requests.

## 20. Что сознательно не делать сейчас

- Не переписывать весь роутинг в `/learn/week/:id` первым diff.
- Не включать свободный AI-chat.
- Не делать реальную Stitch API-интеграцию до проверки доступности и условий.
- Не делать полноценный co-edit первым этапом.
- Не расширять курс до 8 недель, пока 4-недельный путь не стал плотным.
- Не добавлять новые зависимости для того, что можно сделать на React,
  Supabase Realtime и текущих service-функциях.
- Не перегружать новичка Git CLI. Сначала snapshot, diff, commit message,
  backup; остальное в ресурсы и уровень 2.

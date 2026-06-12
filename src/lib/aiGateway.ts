// Клиент единого AI-шлюза. Всё общение с LLM идёт через edge-функцию
// ai-gateway (ключ Gemini живёт только на сервере). В демо-режиме (без
// Supabase) или при недоступности функции — детерминированный локальный
// симулятор, чтобы платформа и тур работали всегда.

import { supabase, isRealSupabaseConfigured } from '../supabaseClient';
import { getAnonId } from './analytics';
import { computeLocalScore } from './grading';
import type { CheckResult, RubricCriterionResult, SandboxFiles } from './grading';

export interface LintResult {
  ok: boolean;
  issues: string[];
  suggestions: string[];
}

export interface DiffResult {
  js: string;
  explanation: string;
}

export interface GradeResult {
  score: number;
  status: 'approved' | 'rejected';
  criteria: RubricCriterionResult[];
  review_text: string;
  comments: string[];
}

export interface GradeParams {
  kind: 'code' | 'prompt';
  weekId: number;
  weekTitle: string;
  rubric: string[];
  payload: { html?: string; css?: string; js?: string; prompt?: string };
  staticResults: CheckResult[];
  functionalResults: CheckResult[];
  courseSlug?: string;
}

const GATEWAY_TIMEOUT_MS = 25000;

async function invokeGateway<T>(task: string, payload: unknown): Promise<T> {
  const invocation = supabase.functions.invoke('ai-gateway', {
    body: { task, payload, anon_id: getAnonId() },
  }) as Promise<{ data: T | { error?: string } | null; error: { message: string } | null }>;

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Таймаут AI-шлюза')), GATEWAY_TIMEOUT_MS),
  );

  const { data, error } = await Promise.race([invocation, timeout]);
  if (error) throw new Error(error.message);
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------- Локальный симулятор (демо-режим) ----------------

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9#\-_]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5)
    .slice(0, 6);
}

function mockLint(params: { prompt: string; requiredIds: string[] }): LintResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const text = params.prompt.toLowerCase();

  if (params.prompt.trim().length < 40) {
    issues.push('Промпт слишком короткий — ИИ додумает детали за вас.');
    suggestions.push('Опишите, что именно должно произойти на экране и при каком действии пользователя.');
  }
  const missingIds = params.requiredIds.filter((id) => !text.includes(id.replace('#', '').toLowerCase()));
  if (missingIds.length) {
    issues.push(`Не указаны конкретные элементы интерфейса: ${missingIds.join(', ')}.`);
    suggestions.push(`Сошлитесь на ID из index.html: ${params.requiredIds.join(', ')} — так ИИ не промахнётся.`);
  }
  if (!/добав|сдела|напиши|реализуй|создай|повесь/.test(text)) {
    issues.push('Нет явного глагола-действия.');
    suggestions.push('Начните с действия: «Добавь обработчик клика...», «Реализуй функцию...».');
  }

  return { ok: issues.length === 0, issues, suggestions };
}

function mockGrade(params: GradeParams): GradeResult {
  const workText = [
    params.payload.html,
    params.payload.css,
    params.payload.js,
    params.payload.prompt,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  const allFunctionalPassed =
    params.functionalResults.length > 0 && params.functionalResults.every((r) => r.passed);

  const criteria: RubricCriterionResult[] = params.rubric.map((criterion, i) => {
    const tokens = significantTokens(criterion);
    const tokenHit = tokens.some((t) => workText.includes(t));
    const passed = tokenHit || (allFunctionalPassed && workText.length > 150);
    return {
      index: i + 1,
      passed,
      evidence: passed
        ? 'Признаки выполнения найдены в работе (эвристика демо-режима).'
        : 'Подтверждений выполнения в работе не найдено.',
      advice: passed ? undefined : `Проверьте критерий: «${criterion}».`,
    };
  });

  const score = computeLocalScore({
    rubricResults: criteria,
    staticResults: params.staticResults,
    functionalResults: params.functionalResults,
  });

  const failed = criteria.filter((c) => !c.passed);
  const review_text = [
    `### Отчёт о ревью (Демо-симулятор, без живого ИИ)`,
    ``,
    `Работа по теме **${params.weekTitle}** проверена по рубрике из ${params.rubric.length} критериев.`,
    ``,
    `- Статические проверки: ${params.staticResults.filter((r) => r.passed).length}/${params.staticResults.length}`,
    `- Функциональные тесты песочницы: ${params.functionalResults.filter((r) => r.passed).length}/${params.functionalResults.length}`,
    `- Критерии рубрики: ${criteria.length - failed.length}/${criteria.length}`,
    ``,
    failed.length
      ? `Доработайте: ${failed.map((f) => `критерий ${f.index}`).join(', ')}.`
      : `Все критерии рубрики выполнены. Отличная работа!`,
    ``,
    `> Подключите Supabase и задеплойте функцию ai-gateway, чтобы получать живое ревью от Gemini.`,
  ].join('\n');

  return {
    score,
    status: score >= 80 ? 'approved' : 'rejected',
    criteria,
    review_text,
    comments: failed.map((f) => f.advice || `Критерий ${f.index} не выполнен.`),
  };
}

// Словарь эвристик для объяснения строк кода в демо-режиме (без живого ИИ).
const LINE_EXPLAIN_RULES: Array<{ pattern: RegExp; explain: string }> = [
  { pattern: /addEventListener\s*\(/, explain: 'Эта строка «подписывается» на событие: когда пользователь что-то сделает (клик, ввод), браузер запустит указанную функцию. Это основа интерактивности.' },
  { pattern: /querySelector(All)?\s*\(/, explain: 'Здесь мы находим элемент на странице по CSS-селектору — как поиск по адресу. Дальше с найденным элементом можно работать из JS.' },
  { pattern: /\bconst\s+/, explain: '`const` создаёт «коробку» с именем для значения, которое нельзя перезаписать. Так код защищён от случайных изменений.' },
  { pattern: /\blet\s+/, explain: '`let` создаёт переменную, значение которой можно менять позже — например, счётчик или текущее состояние.' },
  { pattern: /\bfunction\b|=>\s*[{(]?/, explain: 'Это объявление функции — именованный «рецепт» из шагов, который можно запускать сколько угодно раз.' },
  { pattern: /\breturn\b/, explain: '`return` отдаёт результат наружу и завершает функцию. Всё, что после него внутри функции, уже не выполнится.' },
  { pattern: /\bif\s*\(/, explain: 'Условие: код внутри выполнится только если выражение в скобках истинно. Так программа «принимает решения».' },
  { pattern: /\bfor\b|\bwhile\b|\.map\s*\(|\.forEach\s*\(/, explain: 'Это цикл/перебор: одно и то же действие повторяется для каждого элемента, чтобы не копировать код руками.' },
  { pattern: /fetch\s*\(|await\b/, explain: 'Здесь происходит асинхронная операция (например, запрос к серверу): код «ждёт» ответ, не замораживая страницу.' },
  { pattern: /localStorage/, explain: '`localStorage` — маленькое хранилище в браузере: данные переживут перезагрузку страницы, но живут только на этом устройстве.' },
  { pattern: /innerHTML|textContent/, explain: 'Эта строка меняет содержимое элемента на странице — так JS «рисует» новые данные для пользователя.' },
  { pattern: /console\.(log|error|warn)/, explain: '`console.log` — фонарик разработчика: выводит значение в консоль браузера (F12), чтобы понять, что происходит внутри.' },
  { pattern: /<(div|section|main|header|footer|nav|article)\b/, explain: 'Это структурный HTML-тег — «коробка» для группировки содержимого. Сама по себе невидима, но задаёт каркас страницы.' },
  { pattern: /<(button|input|form|select|textarea)\b/, explain: 'Интерактивный HTML-элемент: с ним пользователь взаимодействует напрямую, а JS слушает его события.' },
  { pattern: /class\s*=|className/, explain: 'Атрибут class вешает на элемент «ярлык», по которому CSS применит стили, а JS сможет найти элемент.' },
  { pattern: /display\s*:\s*(flex|grid)/, explain: 'Включается раскладка flex/grid — элемент становится «умным контейнером», который сам распределяет детей по строкам и колонкам.' },
  { pattern: /:\s*hover|transition|animation/, explain: 'Это про «жизнь» интерфейса: стиль при наведении или плавная анимация. Маленькая деталь, которая делает UI приятным.' },
];

function mockExplain(params: {
  title: string;
  content: string;
  focusLine?: { number: number; text: string };
}): ExplainResult {
  if (params.focusLine) {
    const line = params.focusLine.text.trim();
    const rule = LINE_EXPLAIN_RULES.find((r) => r.pattern.test(line));
    const base = rule
      ? rule.explain
      : 'Эта строка — часть общей логики примера. Прочитайте её слева направо: что берём, что делаем, куда кладём результат.';
    return {
      explanation: `Строка ${params.focusLine.number}: \`${line.slice(0, 80)}\`\n\n${base}`,
      analogy: 'Совет: выделяйте в каждой строке «глагол» (что делаем) и «существительное» (с чем делаем) — так читается любой код.',
    };
  }

  const firstSentence = params.content.split(/(?<=[.!?])\s+/)[0] || params.content;
  return {
    explanation: [
      `Простыми словами: ${firstSentence}`,
      '',
      'Зачем это вам: в вайб-кодинге вы не пишете код руками, но должны понимать идею — тогда вы сможете точно ставить задачу ИИ и проверять результат.',
      '',
      'Мини-проверка себя: перескажите мысль слайда одним предложением, как будто объясняете другу.',
    ].join('\n'),
    analogy: 'Подключите Supabase + функцию ai-gateway — и здесь будет живое объяснение от Gemini под ваш уровень.',
  };
}

// ---------------- Публичное API ----------------

export interface ExplainResult {
  explanation: string;
  analogy?: string;
}

/** ИИ-учитель: объясняет слайд или конкретную строку кода простым языком. */
export async function explainSlide(params: {
  title: string;
  content: string;
  codeSnippet?: string;
  codeLanguage?: string;
  focusLine?: { number: number; text: string };
}): Promise<ExplainResult> {
  if (isRealSupabaseConfigured) {
    try {
      return await invokeGateway<ExplainResult>('explain_slide', {
        title: params.title,
        content: params.content,
        code_snippet: params.codeSnippet,
        code_language: params.codeLanguage,
        focus_line: params.focusLine,
      });
    } catch (e) {
      console.warn('ai-gateway explain недоступен, локальное объяснение:', e);
    }
  }
  await delay(600);
  return mockExplain(params);
}

export async function lintPrompt(params: {
  prompt: string;
  requiredIds: string[];
  goal: string;
}): Promise<LintResult> {
  if (isRealSupabaseConfigured) {
    try {
      return await invokeGateway<LintResult>('lint_prompt', {
        prompt: params.prompt,
        required_ids: params.requiredIds,
        goal: params.goal,
      });
    } catch (e) {
      console.warn('ai-gateway lint недоступен, локальный линтер:', e);
    }
  }
  await delay(400);
  return mockLint(params);
}

/** Генерация JS-патча для тура. null → вызывающий код применит заготовленный fallback. */
export async function generateDiff(params: {
  files: SandboxFiles;
  instruction: string;
  requiredIds: string[];
}): Promise<DiffResult | null> {
  if (isRealSupabaseConfigured) {
    try {
      const res = await invokeGateway<DiffResult>('generate_diff', {
        files: params.files,
        instruction: params.instruction,
        required_ids: params.requiredIds,
      });
      if (res?.js) return res;
    } catch (e) {
      console.warn('ai-gateway diff недоступен, применяю заготовку:', e);
    }
    return null;
  }
  await delay(900);
  return null; // демо-режим: тур использует заготовленный дифф
}

/** Loop Breaker: заплатка по логу ошибки. null → откат к снапшоту + заготовка. */
export async function breakLoop(params: {
  js: string;
  errorLog: string;
}): Promise<DiffResult | null> {
  if (isRealSupabaseConfigured) {
    try {
      const res = await invokeGateway<DiffResult>('loop_breaker', {
        js: params.js,
        error_log: params.errorLog,
      });
      if (res?.js) return res;
    } catch (e) {
      console.warn('ai-gateway loop_breaker недоступен:', e);
    }
    return null;
  }
  await delay(700);
  return null;
}

/** Грейдинг сдачи. В реальном режиме вердикт и запись делает сервер. */
export async function gradeSubmission(params: GradeParams): Promise<GradeResult> {
  const functionalSummary = params.functionalResults.length
    ? `${params.functionalResults.filter((r) => r.passed).length}/${params.functionalResults.length} прошло (${params.functionalResults.map((r) => `${r.label}: ${r.passed ? 'OK' : 'FAIL'}`).join('; ')})`
    : undefined;

  if (isRealSupabaseConfigured) {
    try {
      return await invokeGateway<GradeResult>('grade_submission', {
        kind: params.kind,
        week_id: params.weekId,
        week_title: params.weekTitle,
        course_slug: params.courseSlug || 'vibe-coding-basics',
        rubric: params.rubric,
        payload: params.payload,
        static_results: params.staticResults,
        functional_results: params.functionalResults,
        functional_summary: functionalSummary,
      });
    } catch (e) {
      console.warn('ai-gateway grade недоступен, демо-грейдер:', e);
    }
  }

  await delay(1200);
  const result = mockGrade(params);

  // В демо-режиме сохраняем сабмишен локально (mock-клиент пишет в localStorage),
  // чтобы кабинет куратора показывал работы и без облака.
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      await supabase.from('submissions').insert({
        user_id: userData.user.id,
        course_slug: params.courseSlug || 'vibe-coding-basics',
        week_id: params.weekId,
        kind: params.kind,
        payload: params.payload,
        static_results: params.staticResults,
        functional_results: params.functionalResults,
        rubric_results: result.criteria,
        score: result.score,
        status: result.status,
        review_text: result.review_text,
        submitted_at: new Date().toISOString(),
      });
    }
  } catch {
    /* демо-режим не должен падать из-за хранилища */
  }

  return result;
}

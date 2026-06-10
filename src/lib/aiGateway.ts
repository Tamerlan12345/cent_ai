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

// ---------------- Публичное API ----------------

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

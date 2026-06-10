// Стейт-машина вводного тура (Zustand + persist).
// Инварианты:
//  1. Переходы только по таблице TOUR_TRANSITIONS — никаких прыжков.
//  2. Тур никогда не блокируется LLM: живой ответ валидируется guardrails,
//     при любой проблеме молча применяется заготовка шаблона.
//  3. Состояние переживает перезагрузку страницы (resume из localStorage).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TourStepId, TourChatMessage } from './tourTypes';
import { TOUR_TRANSITIONS } from './tourTypes';
import { getTourTemplate } from './tourTemplates';
import { lintTourPrompt } from './promptLinter';
import type { TourLintResult } from './promptLinter';
import { validateGeneratedJs } from './guardrails';
import { generateDiff, breakLoop } from '../lib/aiGateway';
import { trackTourEvent } from '../lib/analytics';
import {
  runStaticChecks,
  computeLocalScore,
  type CheckResult,
  type RubricCriterionResult,
  type SandboxFiles,
} from '../lib/grading';

export interface TourGraderReport {
  score: number;
  passed: boolean;
  staticResults: CheckResult[];
  functionalResults: CheckResult[];
  rubricResults: RubricCriterionResult[];
  feedback: string[];
}

interface TourState {
  currentStep: TourStepId;
  templateId: string | null;
  files: SandboxFiles;
  chat: TourChatMessage[];
  promptDraft: string;
  lintResult: TourLintResult | null;
  lintAttempts: number;
  pendingDiff: { original: string; modified: string; explanation: string; fromLiveAi: boolean } | null;
  isDiffApproved: boolean;
  snapshotJs: string | null;
  errorSimulated: boolean;
  loopBreakerUsed: boolean;
  loopBreakerExplanation: string | null;
  graderReport: TourGraderReport | null;
  generating: boolean;
  grading: boolean;
  startedAt: number | null;
  completedAt: number | null;

  // Действия (переходы)
  selectProject: (templateId: string) => void;
  setPromptDraft: (text: string) => void;
  submitPrompt: () => Promise<void>;
  approveDiff: () => void;
  rejectDiff: () => void;
  triggerSimulatedError: () => void;
  activateLoopBreaker: () => Promise<void>;
  setJs: (js: string) => void;
  runGrader: (functionalResults: CheckResult[], consoleErrorCount: number) => void;
  resetTour: () => void;
}

const EMPTY_FILES: SandboxFiles = { html: '', css: '', js: '' };

function guardTransition(from: TourStepId, to: TourStepId): boolean {
  const allowed = TOUR_TRANSITIONS[from].includes(to);
  if (!allowed) {
    console.warn(`[tour-fsm] Запрещённый переход ${from} → ${to} проигнорирован.`);
  }
  return allowed;
}

const initialState = {
  currentStep: 'SELECT_PROJECT' as TourStepId,
  templateId: null,
  files: EMPTY_FILES,
  chat: [] as TourChatMessage[],
  promptDraft: '',
  lintResult: null,
  lintAttempts: 0,
  pendingDiff: null,
  isDiffApproved: false,
  snapshotJs: null,
  errorSimulated: false,
  loopBreakerUsed: false,
  loopBreakerExplanation: null,
  graderReport: null,
  generating: false,
  grading: false,
  startedAt: null,
  completedAt: null,
};

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      ...initialState,

      selectProject: (templateId) => {
        const state = get();
        if (!guardTransition(state.currentStep, 'WRITE_PROMPT')) return;
        const template = getTourTemplate(templateId);
        if (!template) return;

        trackTourEvent('SELECT_PROJECT', 'project_selected', { templateId });
        set({
          currentStep: 'WRITE_PROMPT',
          templateId,
          files: { ...template.files },
          startedAt: state.startedAt ?? Date.now(),
          chat: [
            {
              role: 'ai',
              text: `Отличный выбор! Я подготовил Project Brief и собрал стартовую разметку с базовым макетом — она уже в песочнице справа.\n\n${template.brief}`,
            },
            {
              role: 'system',
              text: 'Теперь твоя роль — Режиссёр. Опиши ИИ первую задачу: добавить интерактивность.',
            },
          ],
        });
      },

      setPromptDraft: (text) => set({ promptDraft: text, lintResult: null }),

      submitPrompt: async () => {
        const state = get();
        const template = getTourTemplate(state.templateId);
        if (!template || state.generating) return;
        if (!guardTransition(state.currentStep, 'AUDIT_DIFF')) return;

        const prompt = state.promptDraft.trim();
        const lint = lintTourPrompt(prompt, template);

        // Линтер тормозит слабые промпты, но после 2 попыток выпускает —
        // тур не должен превращаться в стену
        if (!lint.ok && state.lintAttempts < 2) {
          trackTourEvent('WRITE_PROMPT', 'lint_blocked', { issues: lint.issues.length });
          set({ lintResult: lint, lintAttempts: state.lintAttempts + 1 });
          return;
        }

        trackTourEvent('WRITE_PROMPT', 'prompt_submitted', {
          length: prompt.length,
          lintOk: lint.ok,
        });

        set({
          generating: true,
          lintResult: null,
          chat: [...state.chat, { role: 'user', text: prompt }],
        });

        // Гибридный движок: живой LLM → guardrails → заготовка
        let js = template.expectedDiff.js;
        let explanation = template.expectedDiff.explanation;
        let fromLiveAi = false;

        const live = await generateDiff({
          files: state.files,
          instruction: prompt,
          requiredIds: template.requiredIds,
        });

        if (live && validateGeneratedJs(live.js, template)) {
          js = live.js;
          explanation = live.explanation || explanation;
          fromLiveAi = true;
        }

        trackTourEvent('WRITE_PROMPT', 'diff_generated', { fromLiveAi });

        set((s) => ({
          generating: false,
          currentStep: 'AUDIT_DIFF',
          pendingDiff: { original: s.files.js, modified: js, explanation, fromLiveAi },
          chat: [
            ...s.chat,
            { role: 'ai', text: `${explanation}\n\nЯ не переписываю файлы напрямую — проверь дифф в Diff-Auditor и реши, принимать ли изменения.` },
          ],
        }));
      },

      approveDiff: () => {
        const state = get();
        if (state.currentStep !== 'AUDIT_DIFF' || !state.pendingDiff) return;
        trackTourEvent('AUDIT_DIFF', 'diff_approved', { fromLiveAi: state.pendingDiff.fromLiveAi });
        set({
          files: { ...state.files, js: state.pendingDiff.modified },
          snapshotJs: state.pendingDiff.modified,
          pendingDiff: null,
          isDiffApproved: true,
          chat: [
            ...state.chat,
            { role: 'system', text: 'Изменения утверждены и внесены в app.js. Превью обновлено — проверь, что всё работает!' },
          ],
        });
      },

      rejectDiff: () => {
        const state = get();
        if (!guardTransition(state.currentStep, 'WRITE_PROMPT')) return;
        trackTourEvent('AUDIT_DIFF', 'diff_rejected', {});
        set({
          currentStep: 'WRITE_PROMPT',
          pendingDiff: null,
          chat: [
            ...state.chat,
            { role: 'system', text: 'Изменения отклонены. Уточни промпт — и отправь ИИ новую инструкцию.' },
          ],
        });
      },

      triggerSimulatedError: () => {
        const state = get();
        const template = getTourTemplate(state.templateId);
        if (!template || !state.isDiffApproved) return;
        if (!guardTransition(state.currentStep, 'DEBUG_ERROR')) return;

        trackTourEvent('DEBUG_ERROR', 'error_simulated', { templateId: template.id });
        set({
          currentStep: 'DEBUG_ERROR',
          errorSimulated: true,
          files: { ...state.files, js: template.brokenJs },
          chat: [
            ...state.chat,
            {
              role: 'system',
              text: `⚠️ СИМУЛЯЦИЯ: ты попросил ИИ «немного отрефакторить» код, и он потерял важную строку. Так выглядит реальный тупик вайб-кодинга: превью сломалось, в консоли — ${template.brokenErrorHint}.`,
            },
            {
              role: 'system',
              text: 'Не пиши ИИ «исправь это» — в захламлённом контексте он будет ходить по кругу. Сбрось контекст Кнопкой Паники.',
            },
          ],
        });
      },

      activateLoopBreaker: async () => {
        const state = get();
        const template = getTourTemplate(state.templateId);
        if (!template || state.currentStep !== 'DEBUG_ERROR' || state.generating) return;
        if (!guardTransition(state.currentStep, 'RUN_GRADER')) return;

        trackTourEvent('DEBUG_ERROR', 'loop_breaker_activated', {});
        set({ generating: true });

        // Живой ИИ получает только код и лог ошибки (контекст чата сброшен)
        let fixedJs = template.fixedJs;
        let explanation = template.fixExplanation;

        const live = await breakLoop({
          js: state.files.js,
          errorLog: template.brokenErrorHint,
        });
        if (live && validateGeneratedJs(live.js, template)) {
          fixedJs = live.js;
          explanation = live.explanation || explanation;
        }

        set({
          generating: false,
          currentStep: 'RUN_GRADER',
          loopBreakerUsed: true,
          loopBreakerExplanation: explanation,
          files: { ...state.files, js: fixedJs },
          snapshotJs: fixedJs,
          // Loop Breaker очищает историю чата — это его суть
          chat: [
            { role: 'system', text: '🔄 Контекст сброшен. Код откачен к рабочему снапшоту, ИИ получил только лог ошибки и код.' },
            { role: 'ai', text: `Архитектурная заплатка применена.\n\n${explanation}` },
            { role: 'system', text: 'Превью снова работает. Осталось сдать проект AI-грейдеру!' },
          ],
        });
      },

      setJs: (js) => {
        const state = get();
        // Свободное редактирование разрешено только на финальном шаге
        if (state.currentStep !== 'RUN_GRADER') return;
        set({ files: { ...state.files, js } });
      },

      runGrader: (functionalResults, consoleErrorCount) => {
        const state = get();
        const template = getTourTemplate(state.templateId);
        if (!template || state.currentStep !== 'RUN_GRADER') return;

        const staticResults = runStaticChecks(state.files, template.staticSpec);
        const functionalAllPassed =
          functionalResults.length > 0 && functionalResults.every((r) => r.passed);
        const consoleClean = consoleErrorCount === 0;

        // Рубрика тура детерминирована: критерии доказываются тестами и консолью
        const rubricResults: RubricCriterionResult[] = template.rubric.map((criterion, i) => {
          const isConsoleCriterion = /консол/i.test(criterion);
          const passed = isConsoleCriterion
            ? consoleClean
            : functionalAllPassed && staticResults.every((r) => r.passed);
          return {
            index: i + 1,
            passed,
            evidence: passed
              ? isConsoleCriterion
                ? 'Консоль песочницы чистая.'
                : 'Подтверждено функциональными тестами песочницы.'
              : isConsoleCriterion
                ? `В консоли ${consoleErrorCount} ошибок.`
                : 'Автотесты песочницы не прошли.',
            advice: passed ? undefined : `Проверь: ${criterion.toLowerCase()}.`,
          };
        });

        const score = computeLocalScore({ rubricResults, staticResults, functionalResults });
        const passed = score >= 80;

        const feedback = passed
          ? [
              'Отличная работа! Логика кнопок верна, код чист.',
              'Ты прошёл полный цикл вайб-кодера: идея → промпт → аудит диффа → выход из тупика → релиз.',
            ]
          : [
              ...rubricResults.filter((r) => !r.passed).map((r) => r.advice || ''),
              'Поправь код прямо в редакторе и нажми «Проверить решение» ещё раз.',
            ];

        trackTourEvent('RUN_GRADER', passed ? 'grader_passed' : 'grader_failed', { score });

        const report: TourGraderReport = {
          score,
          passed,
          staticResults,
          functionalResults,
          rubricResults,
          feedback,
        };

        if (passed) {
          if (!guardTransition(state.currentStep, 'TOUR_COMPLETED')) return;
          localStorage.setItem('centras_tour_badge', new Date().toISOString());
          trackTourEvent('TOUR_COMPLETED', 'badge_awarded', {
            durationSec: state.startedAt ? Math.round((Date.now() - state.startedAt) / 1000) : null,
          });
          set({ graderReport: report, currentStep: 'TOUR_COMPLETED', completedAt: Date.now() });
        } else {
          set({ graderReport: report });
        }
      },

      resetTour: () => {
        trackTourEvent('TOUR_RESET', 'tour_reset', {});
        set({ ...initialState, files: { ...EMPTY_FILES } });
      },
    }),
    {
      name: 'centras_tour_state',
      version: 1,
      partialize: (state) => ({
        currentStep: state.currentStep,
        templateId: state.templateId,
        files: state.files,
        chat: state.chat,
        promptDraft: state.promptDraft,
        lintAttempts: state.lintAttempts,
        pendingDiff: state.pendingDiff,
        isDiffApproved: state.isDiffApproved,
        snapshotJs: state.snapshotJs,
        errorSimulated: state.errorSimulated,
        loopBreakerUsed: state.loopBreakerUsed,
        loopBreakerExplanation: state.loopBreakerExplanation,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
      }),
    },
  ),
);

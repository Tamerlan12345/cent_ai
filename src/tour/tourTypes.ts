import type { FunctionalTest, SandboxFiles, StaticCheckSpec } from '../lib/grading';

export type TourStepId =
  | 'SELECT_PROJECT'   // Шаг 1: выбор идеи (роль: Автор идеи)
  | 'WRITE_PROMPT'     // Шаг 2: промпт для ИИ (роль: Режиссёр)
  | 'AUDIT_DIFF'       // Шаг 3: аудит диффа (роль: Редактор)
  | 'DEBUG_ERROR'      // Шаг 4: баг и Loop Breaker
  | 'RUN_GRADER'       // Шаг 5: AI-грейдинг и релиз
  | 'TOUR_COMPLETED';  // Финал

export interface TourChatMessage {
  role: 'user' | 'ai' | 'system';
  text: string;
}

export interface TourTemplate {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  /** Project Brief, который «мгновенно генерирует ИИ» на шаге 1 */
  brief: string;
  /** Цель G1 — используется линтером и подсказками */
  goal: string;
  /** Стартовые файлы песочницы (JS пуст — его сгенерирует ИИ) */
  files: SandboxFiles;
  /** ID элементов, которые обязан упоминать промпт студента */
  requiredIds: string[];
  /** Пример сильного промпта (показывается как подсказка после ошибок линтера) */
  examplePrompt: string;
  /** Заготовленный дифф — гарантированный fallback, если живой ИИ молчит/ошибается */
  expectedDiff: { js: string; explanation: string };
  /** Намеренно сломанный JS для шага 4 */
  brokenJs: string;
  /** Текст ошибки, которую увидит студент */
  brokenErrorHint: string;
  /** Заплатка Loop Breaker-а (fallback, если живой ИИ недоступен) */
  fixedJs: string;
  fixExplanation: string;
  /** Рубрика финального грейдинга (DoD) */
  rubric: string[];
  functionalTests: FunctionalTest[];
  staticSpec: StaticCheckSpec;
}

/** Таблица разрешённых переходов стейт-машины тура */
export const TOUR_TRANSITIONS: Record<TourStepId, TourStepId[]> = {
  SELECT_PROJECT: ['WRITE_PROMPT'],
  WRITE_PROMPT: ['AUDIT_DIFF'],
  AUDIT_DIFF: ['WRITE_PROMPT', 'DEBUG_ERROR'],
  DEBUG_ERROR: ['RUN_GRADER'],
  RUN_GRADER: ['TOUR_COMPLETED'],
  TOUR_COMPLETED: [],
};

export const TOUR_STEP_ORDER: TourStepId[] = [
  'SELECT_PROJECT',
  'WRITE_PROMPT',
  'AUDIT_DIFF',
  'DEBUG_ERROR',
  'RUN_GRADER',
  'TOUR_COMPLETED',
];

export const TOUR_STEP_LABELS: Record<TourStepId, string> = {
  SELECT_PROJECT: 'Идея',
  WRITE_PROMPT: 'Промпт',
  AUDIT_DIFF: 'Аудит диффа',
  DEBUG_ERROR: 'Отладка',
  RUN_GRADER: 'Релиз',
  TOUR_COMPLETED: 'Готово',
};

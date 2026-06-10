// Детерминированный Prompt Linter тура (слой 1, отклик 0 мс).
// Семантический линт через LLM используется в основном курсе (ai-gateway),
// здесь важна мгновенная обратная связь — структурные правила.

import type { TourTemplate } from './tourTypes';

export interface TourLintResult {
  ok: boolean;
  issues: string[];
  hints: string[];
}

const ACTION_VERB = /добав|сдела|напиш|реализ|создай|повесь|подключ|увелич|обнов|показ|меня/i;

export function lintTourPrompt(prompt: string, template: TourTemplate): TourLintResult {
  const issues: string[] = [];
  const hints: string[] = [];
  const text = prompt.toLowerCase();

  if (prompt.trim().length < 30) {
    issues.push('Слишком коротко — ИИ додумает детали за тебя и, скорее всего, неправильно.');
    hints.push('Опиши: что должно произойти, при каком действии пользователя, с какими элементами.');
  }

  const missing = template.requiredIds.filter(
    (id) => !text.includes(id.replace('#', '').toLowerCase()),
  );
  if (missing.length) {
    issues.push(`Промпт не ссылается на конкретные элементы: ${missing.join(', ')}.`);
    hints.push(
      `Укажи ID из index.html — ${template.requiredIds.join(' и ')} — чтобы ИИ работал с нужными элементами, а не выдумывал свои.`,
    );
  }

  if (!ACTION_VERB.test(text)) {
    issues.push('Нет глагола-действия: непонятно, что именно сделать.');
    hints.push('Начни с действия: «Добавь обработчик клика…», «Реализуй функцию…».');
  }

  return { ok: issues.length === 0, issues, hints };
}

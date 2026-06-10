// Guardrails гибридного LLM-движка тура.
// Инвариант: тур никогда не ломается из-за LLM. Любой ответ живой модели
// валидируется против ожидаемой формы; не прошёл — молча применяется
// заготовленный дифф из шаблона.

import type { TourTemplate } from './tourTypes';

const FORBIDDEN = /<\/?script|document\.write|window\.location|fetch\s*\(|XMLHttpRequest|importScripts|eval\s*\(|localStorage\.clear/i;

export function validateGeneratedJs(js: string, template: TourTemplate): boolean {
  if (!js || js.length < 20 || js.length > 4000) return false;
  if (FORBIDDEN.test(js)) return false;
  if (!js.includes('addEventListener')) return false;

  // Патч обязан работать с элементами из брифа
  const referencesAllIds = template.requiredIds.every((id) =>
    js.includes(id.replace('#', '')),
  );
  if (!referencesAllIds) return false;

  // Синтаксическая валидность без исполнения
  try {
    new Function(js);
  } catch {
    return false;
  }
  return true;
}

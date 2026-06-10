// Грейдинг v2 — слой 1 (статика) и общие типы проверок.
// Слой 2 (функциональные тесты) исполняется в iframe через consoleBridge.
// Слой 3 (рубрика LLM) — на сервере в ai-gateway.

export interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface FunctionalTest {
  id: string;
  label: string;
  /** Тело функции, исполняется в песочнице: получает api {$, click, text, exists, type}. Должно вернуть true/false. */
  script: string;
}

export interface RubricCriterionResult {
  index: number;
  passed: boolean;
  evidence: string;
  advice?: string;
}

export interface StaticCheckSpec {
  /** CSS-селекторы, которые обязаны существовать в HTML (например '#counter') */
  requiredSelectors?: string[];
  /** Паттерны, которые обязаны встречаться в JS */
  requiredJsPatterns?: { pattern: RegExp; label: string }[];
}

export interface SandboxFiles {
  html: string;
  css: string;
  js: string;
}

/** Слой 1: мгновенные бесплатные проверки до любого вызова LLM */
export function runStaticChecks(files: SandboxFiles, spec: StaticCheckSpec): CheckResult[] {
  const results: CheckResult[] = [];

  // HTML парсится без фатальных ошибок
  const doc = new DOMParser().parseFromString(files.html, 'text/html');
  const parseError = doc.querySelector('parsererror');
  results.push({
    id: 'html-parses',
    label: 'HTML-разметка корректна',
    passed: !parseError,
    detail: parseError ? 'Парсер нашёл ошибку в разметке' : undefined,
  });

  // Обязательные элементы интерфейса
  for (const selector of spec.requiredSelectors ?? []) {
    const found = !!doc.querySelector(selector);
    results.push({
      id: `selector:${selector}`,
      label: `Элемент ${selector} существует`,
      passed: found,
      detail: found ? undefined : `В HTML нет элемента, соответствующего ${selector}`,
    });
  }

  // Обязательные конструкции в JS
  for (const { pattern, label } of spec.requiredJsPatterns ?? []) {
    results.push({
      id: `js:${label}`,
      label,
      passed: pattern.test(files.js),
    });
  }

  // JS синтаксически валиден (без исполнения)
  let jsValid = true;
  let jsDetail: string | undefined;
  try {
    new Function(files.js);
  } catch (e) {
    jsValid = false;
    jsDetail = e instanceof Error ? e.message : String(e);
  }
  results.push({
    id: 'js-parses',
    label: 'JavaScript без синтаксических ошибок',
    passed: jsValid,
    detail: jsDetail,
  });

  return results;
}

/** Зеркало серверной формулы: рубрика 50% + функциональные 40% + статика 10% */
export function computeLocalScore(opts: {
  rubricResults: RubricCriterionResult[];
  staticResults: CheckResult[];
  functionalResults: CheckResult[];
}): number {
  const share = (passed: number, total: number, empty = 1) => (total ? passed / total : empty);
  const rubric = share(
    opts.rubricResults.filter((c) => c.passed).length,
    opts.rubricResults.length,
    0,
  );
  const stat = share(opts.staticResults.filter((c) => c.passed).length, opts.staticResults.length);
  const func = share(
    opts.functionalResults.filter((c) => c.passed).length,
    opts.functionalResults.length,
  );
  return Math.round(100 * (0.5 * rubric + 0.4 * func + 0.1 * stat));
}

// Supabase Edge Function: ai-gateway (Deno)
// Единственная точка входа для всех LLM-вызовов платформы.
// Ключ Gemini живёт ТОЛЬКО здесь (supabase secrets), на клиент не попадает.
//
// Задачи (task):
//   lint_prompt      — семантическая проверка промпта студента (модель-lite)
//   generate_diff    — генерация JS-патча для тура (с guardrails на клиенте)
//   loop_breaker     — архитектурная заплатка по логу ошибки (тур, шаг 4)
//   grade_submission — рубричный грейдинг ДЗ; вердикт и запись в submissions
//                      происходят ЗДЕСЬ (service role), клиенту не доверяем.
//   explain_slide    — ИИ-учитель: объясняет слайд или строку кода (модель-lite)
//
// Secrets: GEMINI_API_KEY (обязателен), GEMINI_MODEL (default gemini-2.5-flash),
//          GEMINI_MODEL_LITE (default gemini-2.5-flash-lite)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const GEMINI_MODEL_LITE = Deno.env.get("GEMINI_MODEL_LITE") || "gemini-2.5-flash-lite";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Лимиты вызовов в час
const RATE_LIMIT_AUTH = 60;
const RATE_LIMIT_ANON = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------- утилиты ----------

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini ${model} → HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJsonLoose<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch { /* ignore */ }
    }
    return fallback;
  }
}

async function getCallerUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice(7);
  try {
    const { data } = await admin.auth.getUser(jwt);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function checkRateLimit(userId: string | null, anonId: string | null): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const query = admin
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  const { count } = userId
    ? await query.eq("user_id", userId)
    : await query.eq("anon_id", anonId ?? "unknown");
  const limit = userId ? RATE_LIMIT_AUTH : RATE_LIMIT_ANON;
  return (count ?? 0) < limit;
}

async function logCall(params: {
  userId: string | null;
  anonId: string | null;
  task: string;
  model: string;
  cached: boolean;
  inputChars: number;
  outputChars: number;
  durationMs: number;
}) {
  await admin.from("ai_calls").insert({
    user_id: params.userId,
    anon_id: params.anonId,
    task: params.task,
    model: params.model,
    cached: params.cached,
    input_chars: params.inputChars,
    output_chars: params.outputChars,
    duration_ms: params.durationMs,
  });
}

// ---------- промпты задач ----------

function buildLintPrompt(payload: { prompt: string; required_ids: string[]; goal: string }): string {
  return `Ты — линтер учебных промптов на курсе вайбкодинга. Студент пишет инструкцию для ИИ-разработчика.
Цель задания: ${payload.goal}
Элементы интерфейса, которые промпт обязан упоминать (ID из index.html): ${payload.required_ids.join(", ")}

Промпт студента:
"""
${payload.prompt}
"""

Оцени промпт. Верни строго JSON:
{
  "ok": <true если промпт достаточно конкретен для надёжной генерации кода>,
  "issues": ["проблема 1", ...],
  "suggestions": ["конкретный совет как улучшить 1", ...]
}
Пиши по-русски, кратко. Не используй markdown.`;
}

function buildDiffPrompt(payload: {
  files: { html: string; css: string; js: string };
  instruction: string;
  required_ids: string[];
}): string {
  return `Ты — ИИ-разработчик в учебной песочнице. Тебе дают проект (HTML/CSS/JS) и инструкцию.
Меняй ТОЛЬКО JavaScript. HTML и CSS трогать запрещено.

--- index.html ---
${payload.files.html}

--- app.js (текущий) ---
${payload.files.js}

Инструкция студента: ${payload.instruction}

Требования: используй addEventListener, работай с элементами по ID (${payload.required_ids.join(", ")}), ванильный JS без библиотек, не более 60 строк.
Верни строго JSON:
{
  "js": "<новое полное содержимое app.js>",
  "explanation": "<1-2 предложения по-русски: что изменено и почему>"
}`;
}

function buildLoopBreakerPrompt(payload: {
  js: string;
  error_log: string;
}): string {
  return `Ты — старший разработчик, выводящий новичка из тупика отладки. Контекст чата сброшен, у тебя только код и лог ошибки.

--- app.js (сломанный) ---
${payload.js}

--- Лог консоли ---
${payload.error_log}

Верни строго JSON:
{
  "js": "<исправленное полное содержимое app.js>",
  "explanation": "<по-русски: корень проблемы и суть заплатки, 2-3 предложения>"
}`;
}

function buildGradePrompt(payload: {
  kind: "code" | "prompt";
  week_title: string;
  rubric: string[];
  payload: { html?: string; css?: string; js?: string; prompt?: string };
  functional_summary?: string;
}): string {
  const rubricList = payload.rubric.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const body =
    payload.kind === "code"
      ? `--- HTML ---\n${payload.payload.html || ""}\n\n--- CSS ---\n${payload.payload.css || ""}\n\n--- JS ---\n${payload.payload.js || ""}`
      : `--- Промпт/ТЗ студента ---\n${payload.payload.prompt || ""}`;

  return `Ты — преподаватель курса вайбкодинга Centras CodeAI. Проверь работу студента по теме "${payload.week_title}".
Оценивай СТРОГО по рубрике конкретного задания — по каждому критерию отдельно, с цитатой-доказательством из работы.

Рубрика (Definition of Done):
${rubricList}

${payload.functional_summary ? `Результаты автотестов песочницы (учитывай как факт): ${payload.functional_summary}\n` : ""}
Работа студента:
${body}

Верни строго JSON:
{
  "criteria": [
    { "index": <номер критерия>, "passed": <true|false>, "evidence": "<цитата или факт из работы>", "advice": "<как починить, если failed>" }
  ],
  "review_text": "<развёрнутое ревью в markdown по-русски: сильные стороны, что доработать>"
}
Не выставляй итоговый балл — его посчитает система. Будь честным: критерий passed только при явном выполнении.`;
}

function buildExplainPrompt(payload: {
  title: string;
  content: string;
  code_snippet?: string;
  code_language?: string;
  focus_line?: { number: number; text: string };
}): string {
  const codeBlock = payload.code_snippet
    ? `\nПример кода на слайде (${payload.code_language || "код"}):\n"""\n${payload.code_snippet}\n"""\n`
    : "";

  const focusBlock = payload.focus_line
    ? `\nСтудент кликнул на строку ${payload.focus_line.number}: \`${payload.focus_line.text.trim()}\`
Объясни ИМЕННО эту строку: что она делает, зачем нужна в этом примере и как связана с соседними строками.`
    : `\nОбъясни главную мысль слайда целиком.`;

  return `Ты — ИИ-учитель на курсе вайбкодинга Centras CodeAI. Твой студент — взрослый новичок БЕЗ программистского бэкграунда: он не пишет код руками, а ставит задачи ИИ, поэтому ему важно ПОНИМАНИЕ, а не синтаксис.

Слайд «${payload.title}»:
"""
${payload.content}
"""
${codeBlock}${focusBlock}

Правила ответа:
- Простой разговорный русский, без жаргона; термин — сразу с бытовой расшифровкой.
- Объяснение: 3-5 коротких предложений, без markdown-заголовков и списков.
- analogy: одна яркая бытовая аналогия или мини-вопрос для самопроверки (1-2 предложения).

Верни строго JSON:
{
  "explanation": "<объяснение>",
  "analogy": "<аналогия или вопрос для самопроверки>"
}`;
}

// ---------- грейдинг: серверный подсчёт балла ----------

interface CriterionResult {
  index: number;
  passed: boolean;
  evidence: string;
  advice?: string;
}

function computeScore(opts: {
  rubricResults: CriterionResult[];
  staticPassed: number;
  staticTotal: number;
  functionalPassed: number;
  functionalTotal: number;
}): number {
  const rubricShare = opts.rubricResults.length
    ? opts.rubricResults.filter((c) => c.passed).length / opts.rubricResults.length
    : 0;
  const staticShare = opts.staticTotal ? opts.staticPassed / opts.staticTotal : 1;
  const functionalShare = opts.functionalTotal ? opts.functionalPassed / opts.functionalTotal : 1;
  // Рубрика 50% + функциональные тесты 40% + статика 10%
  return Math.round(100 * (0.5 * rubricShare + 0.4 * functionalShare + 0.1 * staticShare));
}

// ---------- основной обработчик ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const started = Date.now();

  try {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY не задан в secrets проекта Supabase.");

    const { task, payload, anon_id } = await req.json();
    const userId = await getCallerUserId(req);
    const anonId = typeof anon_id === "string" ? anon_id.slice(0, 64) : null;

    // grade_submission доступен только аутентифицированным — он пишет в submissions
    if (task === "grade_submission" && !userId) {
      return new Response(JSON.stringify({ error: "Требуется вход в аккаунт для сдачи работы." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!(await checkRateLimit(userId, anonId))) {
      return new Response(JSON.stringify({ error: "Превышен лимит запросов к ИИ. Попробуйте через час." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Кэш: одинаковый payload → одинаковый ответ без повторного вызова модели
    const cacheKey = await sha256(JSON.stringify({ task, payload }));
    const { data: cachedRow } = await admin
      .from("ai_cache")
      .select("response")
      .eq("hash", cacheKey)
      .maybeSingle();

    let result: unknown;
    let model = GEMINI_MODEL;
    let cached = false;
    let outputChars = 0;

    if (cachedRow?.response && task !== "grade_submission") {
      // grade_submission не кэшируем целиком: нужна свежая запись в submissions
      result = cachedRow.response;
      cached = true;
    } else {
      switch (task) {
        case "lint_prompt": {
          model = GEMINI_MODEL_LITE;
          const raw = await callGemini(model, buildLintPrompt(payload));
          outputChars = raw.length;
          result = parseJsonLoose(raw, { ok: true, issues: [], suggestions: [] });
          break;
        }
        case "explain_slide": {
          model = GEMINI_MODEL_LITE;
          const raw = await callGemini(model, buildExplainPrompt(payload));
          outputChars = raw.length;
          result = parseJsonLoose(raw, {
            explanation: raw || "Не удалось получить объяснение. Попробуйте ещё раз.",
            analogy: "",
          });
          break;
        }
        case "generate_diff": {
          const raw = await callGemini(model, buildDiffPrompt(payload));
          outputChars = raw.length;
          result = parseJsonLoose(raw, { js: "", explanation: "" });
          break;
        }
        case "loop_breaker": {
          const raw = await callGemini(model, buildLoopBreakerPrompt(payload));
          outputChars = raw.length;
          result = parseJsonLoose(raw, { js: "", explanation: "" });
          break;
        }
        case "grade_submission": {
          const raw = await callGemini(model, buildGradePrompt(payload));
          outputChars = raw.length;
          const parsed = parseJsonLoose<{ criteria: CriterionResult[]; review_text: string }>(raw, {
            criteria: [],
            review_text: raw || "Не удалось разобрать ответ модели.",
          });

          const staticResults: { passed: boolean }[] = payload.static_results || [];
          const functionalResults: { passed: boolean }[] = payload.functional_results || [];

          const score = computeScore({
            rubricResults: parsed.criteria,
            staticPassed: staticResults.filter((r) => r.passed).length,
            staticTotal: staticResults.length,
            functionalPassed: functionalResults.filter((r) => r.passed).length,
            functionalTotal: functionalResults.length,
          });
          const status = score >= 80 ? "approved" : "rejected";

          // Запись сабмишена — единственное место, где ставится вердикт
          await admin.from("submissions").insert({
            user_id: userId,
            course_slug: payload.course_slug || "vibe-coding-basics",
            week_id: payload.week_id,
            kind: payload.kind,
            payload: payload.payload,
            static_results: payload.static_results || null,
            functional_results: payload.functional_results || null,
            rubric_results: parsed.criteria,
            score,
            status,
            review_text: parsed.review_text,
          });

          result = {
            score,
            status,
            criteria: parsed.criteria,
            review_text: parsed.review_text,
            comments: parsed.criteria
              .filter((c) => !c.passed)
              .map((c) => c.advice || `Критерий ${c.index} не выполнен.`),
          };
          break;
        }
        default:
          throw new Error(`Неизвестная задача: ${task}`);
      }

      if (!cached && task !== "grade_submission") {
        await admin.from("ai_cache").upsert({ hash: cacheKey, task, response: result });
      }
    }

    await logCall({
      userId,
      anonId,
      task,
      model,
      cached,
      inputChars: JSON.stringify(payload).length,
      outputChars,
      durationMs: Date.now() - started,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

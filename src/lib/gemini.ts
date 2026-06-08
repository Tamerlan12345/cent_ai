const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface ReviewResult {
  score: number;
  comments: string[];
  review_text: string;
}

interface ReviewParams {
  code_html: string;
  code_css: string;
  code_js: string;
  week_title: string;
  dod_criteria: string[];
}

// Mock simulation for demo mode (when API key is not set)
function mockReview({ code_html, code_css, code_js, week_title }: ReviewParams): ReviewResult {
  const totalLen = (code_html?.length || 0) + (code_css?.length || 0) + (code_js?.length || 0);
  let score = 70;
  const comments: string[] = [];

  if (totalLen > 100) score += 10;
  if (code_css?.includes('var(--')) score += 10;
  else comments.push('Не использованы глобальные CSS-переменные для стилизации.');
  if (code_html?.includes('aria-')) score += 5;

  comments.unshift(
    score >= 90
      ? 'Замечательная реализация! Все критерии DoD соблюдены.'
      : 'Код рабочий, но требует косметических правок.'
  );

  return {
    score: Math.min(score, 100),
    comments,
    review_text: `### Отчет о ревью ИИ (Demo Mode)\n\nРабота по теме **${week_title || ''}** проверена.\n\n- **Качество разметки**: Хорошее, использована семантика.\n- **Оценка стилей**: CSS-переменные улучшат поддерживаемость.\n- **Рекомендация**: Разбейте длинные JS-функции на более мелкие.\n\n> Установите VITE_GEMINI_API_KEY в .env для реальной AI-проверки.`,
  };
}

export async function reviewHomework(params: ReviewParams): Promise<ReviewResult> {
  if (!GEMINI_API_KEY) {
    // Demo mode: simulate a 1.5s delay like a real request
    await new Promise((r) => setTimeout(r, 1500));
    return mockReview(params);
  }

  const { code_html, code_css, code_js, week_title, dod_criteria } = params;

  const promptText = `Вы выступаете в роли строгого ИИ-преподавателя курса Centras CodeAI по вайбкодингу.
Ваша задача — провести ревью кода студента по теме "${week_title}" и выставить оценку от 0 до 100.

Критерии сдачи (Definition of Done), которые необходимо проверить:
${(dod_criteria || []).map((c) => `- ${c}`).join('\n')}

Код студента:
--- HTML ---
${code_html}

--- CSS ---
${code_css}

--- JS ---
${code_js}

Напишите подробное ревью кода на РУССКОМ языке. Выделите сильные стороны и конкретные места, требующие доработки.
Вы должны вернуть ответ строго в формате JSON со следующими полями:
{
  "score": <число от 0 до 100>,
  "comments": ["комментарий 1", "комментарий 2"],
  "review_text": "<подробный текст ревью в формате markdown>"
}
Не пишите ничего, кроме JSON. Не используйте markdown-разметку \`\`\`json\`\`\` вокруг ответа, верните чистый JSON.`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API вернул ошибку ${response.status}: ${errorText}`);
  }

  const resultData = await response.json();
  const candidateText: string = resultData.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    return JSON.parse(candidateText.trim()) as ReviewResult;
  } catch {
    return {
      score: 75,
      comments: ['ИИ вернул неформатированный ответ.', 'Код требует ручной проверки.'],
      review_text: candidateText || 'Ошибка парсинга ответа ИИ.',
    };
  }
}

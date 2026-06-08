/* eslint-disable */
// Supabase Edge Function: review-homework
// Runs in Deno environment


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable on Supabase.");
    }

    const { code_html, code_css, code_js, week_title, dod_criteria } = await req.json();

    const promptText = `Вы выступаете в роли строгого ИИ-преподавателя курса Centras CodeAI по вайбкодингу.
Ваша задача — провести ревью кода студента по теме "${week_title}" и выставить оценку от 0 до 100.

Критерии сдачи (Definition of Done), которые необходимо проверить:
${(dod_criteria || []).map((c: string) => `- ${c}`).join("\n")}

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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned error status: ${response.status}. Details: ${errorText}`);
    }

    const resultData = await response.json();
    const candidateText = resultData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON returned by Gemini
    let parsedResult;
    try {
      parsedResult = JSON.parse(candidateText.trim());
    } catch (e) {
      // Fallback if parsing fails
      parsedResult = {
        score: 75,
        comments: ["ИИ вернул неформатированный ответ.", "Код требует ручной проверки."],
        review_text: candidateText || "Ошибка парсинга ответа ИИ."
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { supabase } from '../supabaseClient';
import { reviewHomework } from '../lib/gemini';
import { FileCode, Play, Send, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import './CodeEditor.css';

interface CodeEditorProps {
  weekId: number;
  weekTitle: string;
  dodCriteria: string[];
  studentId: string;
  onHomeworkApproved: () => void;
}

// Starter templates for Monaco Editor per week
const getStarterCodes = (weekId: number) => {
  switch (weekId) {
    case 3:
      return {
        html: `<div class="habit-app">\n  <h1>Мой Трекер Привычек</h1>\n  <form id="habit-form">\n    <input type="text" id="habit-input" placeholder="Какую привычку вырабатываем?" required />\n    <button type="submit">Добавить</button>\n  </form>\n  <div id="habits-list" class="habits-grid">\n    <!-- Привычки рендерятся здесь -->\n  </div>\n</div>`,
        css: `:root {\n  --bg: #0b0f19;\n  --panel: rgba(255, 255, 255, 0.03);\n  --border: rgba(255, 255, 255, 0.08);\n  --text: #f8fafc;\n  --accent: #00f2fe;\n}\n\n.habit-app {\n  max-width: 600px;\n  margin: 2rem auto;\n  background: var(--panel);\n  border: 1px solid var(--border);\n  padding: 2rem;\n  border-radius: 12px;\n  font-family: sans-serif;\n}\n\nform {\n  display: flex;\n  gap: 0.5rem;\n  margin-bottom: 1.5rem;\n}\n\ninput {\n  flex-grow: 1;\n  padding: 0.75rem;\n  background: #020617;\n  border: 1px solid var(--border);\n  color: var(--text);\n  border-radius: 8px;\n}\n\nbutton {\n  padding: 0.75rem 1.5rem;\n  background: var(--accent);\n  color: #000;\n  font-weight: bold;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.habits-grid {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}`,
        js: `// Моки (заглушки) для старта\nconst defaultHabits = [\n  { id: 1, name: "Пить 2 литра воды" },\n  { id: 2, name: "Читать 15 страниц книги" }\n];\n\n// Массив привычек: загрузка из LocalStorage или использование моков\nlet habits = JSON.parse(localStorage.getItem('habits')) || defaultHabits;\n\nconst listContainer = document.getElementById('habits-list');\nconst form = document.getElementById('habit-form');\nconst input = document.getElementById('habit-input');\n\nfunction renderHabits() {\n  listContainer.innerHTML = habits.map(h => \`\n    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">\n      <span>\${h.name}</span>\n      <button style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" onclick="deleteHabit(\${h.id})">Удалить</button>\n    </div>\n  \`).join('');\n}\n\n// Сделайте так, чтобы функция deleteHabit была доступна глобально\nwindow.deleteHabit = function(id) {\n  habits = habits.filter(h => h.id !== id);\n  localStorage.setItem('habits', JSON.stringify(habits));\n  renderHabits();\n};\n\nform.addEventListener('submit', (e) => {\n  e.preventDefault();\n  const name = input.value.trim();\n  if (name) {\n    const newHabit = {\n      id: Date.now(),\n      name: name\n    };\n    habits.push(newHabit);\n    localStorage.setItem('habits', JSON.stringify(habits));\n    renderHabits();\n    input.value = '';\n  }\n});\n\n// Начальный рендеринг\nrenderHabits();`
      };
    case 4:
      return {
        html: `<div class="habit-app">\n  <h1>Отрефакторенный Трекер</h1>\n  <form id="habit-form">\n    <input type="text" id="habit-input" placeholder="Какую привычку вырабатываем?" required />\n    <button type="submit">Добавить</button>\n  </form>\n  <div id="habits-list" class="habits-grid">\n    <!-- Привычки рендерятся здесь -->\n  </div>\n</div>`,
        css: `:root {\n  --bg: #0b0f19;\n  --panel: rgba(255, 255, 255, 0.03);\n  --border: rgba(255, 255, 255, 0.08);\n  --text: #f8fafc;\n  --accent: #00f2fe;\n}\n\n.habit-app {\n  max-width: 600px;\n  margin: 2rem auto;\n  background: var(--panel);\n  border: 1px solid var(--border);\n  padding: 2rem;\n  border-radius: 12px;\n  font-family: sans-serif;\n}\n\nform {\n  display: flex;\n  gap: 0.5rem;\n  margin-bottom: 1.5rem;\n}\n\ninput {\n  flex-grow: 1;\n  padding: 0.75rem;\n  background: #020617;\n  border: 1px solid var(--border);\n  color: var(--text);\n  border-radius: 8px;\n}\n\nbutton {\n  padding: 0.75rem 1.5rem;\n  background: var(--accent);\n  color: #000;\n  font-weight: bold;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.habits-grid {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}`,
        js: `// Код с багами (без валидации спецсимволов XSS и без лимита на 50 символов)\nlet habits = JSON.parse(localStorage.getItem('habits')) || [];\n\nconst listContainer = document.getElementById('habits-list');\nconst form = document.getElementById('habit-form');\nconst input = document.getElementById('habit-input');\n\n// Устаревшие мертвые переменные, которые нужно удалить при рефакторинге:\nconst unusedToken = "123456789";\nconst oldCalculations = 42;\n\nfunction renderHabits() {\n  // Уязвимость XSS: имя вставляется напрямую в HTML без экранирования!\n  listContainer.innerHTML = habits.map(h => \`\n    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">\n      <span>\${h.name}</span>\n      <button style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" onclick="deleteHabit(\${h.id})">Удалить</button>\n    </div>\n  \`).join('');\n}\n\nwindow.deleteHabit = function(id) {\n  habits = habits.filter(h => h.id !== id);\n  localStorage.setItem('habits', JSON.stringify(habits));\n  renderHabits();\n};\n\nform.addEventListener('submit', (e) => {\n  e.preventDefault();\n  const name = input.value; // Нет проверки на максимальную длину 50 символов!\n  \n  const newHabit = {\n    id: Date.now(),\n    name: name\n  };\n  habits.push(newHabit);\n  localStorage.setItem('habits', JSON.stringify(habits));\n  renderHabits();\n  input.value = '';\n});\n\nrenderHabits();\n\n/*\n--- ТЕКСТ РЕЧИ ДЛЯ ЗАЩИТЫ ---\nНапишите текст вашей речи ниже в комментариях:\n1. Здравствуйте! Меня зовут ...\n2. Мой проект решает проблему ...\n3. Ссылка на деплой: ...\n*/`
      };
    default:
      return {
        html: `<div class="sandbox-app">\n  <h2>Практическое задание: Неделя \${weekId}</h2>\n  <p>Редактируйте HTML, CSS и JS, чтобы увидеть изменения живьем.</p>\n  <div id="output-box"></div>\n</div>`,
        css: `.sandbox-app {\n  font-family: sans-serif;\n  padding: 1.5rem;\n  background: #182030;\n  color: #fff;\n  border-radius: 8px;\n}`,
        js: `document.getElementById('output-box').innerHTML = '<span style="color:#00F2FE">Песочница готова к проверке DoD.</span>';`
      };
  }
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  weekId,
  weekTitle,
  dodCriteria,
  studentId,
  onHomeworkApproved,
}) => {
  const defaultCodes = getStarterCodes(weekId);
  
  const [html, setHtml] = useState(defaultCodes.html);
  const [css, setCss] = useState(defaultCodes.css);
  const [js, setJs] = useState(defaultCodes.js);
  
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewResult, setReviewResult] = useState<{
    score: number;
    comments: string[];
    review_text: string;
  } | null>(null);

  // Helper to generate iframe contents
  const getPreviewHtml = (h: string, c: string, j: string) => {
    return `
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }
            ${c}
          </style>
        </head>
        <body>
          ${h}
          <script>
            try {
              ${j}
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              document.body.innerHTML += '<div style="color:#EF4444; background:rgba(239,68,68,0.1); padding:1rem; border-radius:6px; margin-top:1rem; border:1px solid rgba(239,68,68,0.2)">Ошибка выполнения скрипта: ' + msg + '</div>';
            }
          </script>
        </body>
      </html>
    `;
  };

  const [previewDoc, setPreviewDoc] = useState(() =>
    getPreviewHtml(defaultCodes.html, defaultCodes.css, defaultCodes.js)
  );

  // Compile on manual run button
  const handleRunCode = () => {
    setPreviewDoc(getPreviewHtml(html, css, js));
  };

  const activeCode = activeTab === 'html' ? html : activeTab === 'css' ? css : js;
  const activeLanguage = activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript';

  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    if (activeTab === 'html') {
      setHtml(val);
      setPreviewDoc(getPreviewHtml(val, css, js));
    } else if (activeTab === 'css') {
      setCss(val);
      setPreviewDoc(getPreviewHtml(html, val, js));
    } else {
      setJs(val);
      setPreviewDoc(getPreviewHtml(html, css, val));
    }
  };

  const handleResetTemplate = () => {
    if (window.confirm("Вы уверены, что хотите сбросить код к исходному шаблону задания?")) {
      const codes = getStarterCodes(weekId);
      setHtml(codes.html);
      setCss(codes.css);
      setJs(codes.js);
      setPreviewDoc(getPreviewHtml(codes.html, codes.css, codes.js));
    }
  };

  const handleSendHomework = async () => {
    setLoadingReview(true);
    setReviewResult(null);

    try {
      const data = await reviewHomework({
        code_html: html,
        code_css: css,
        code_js: js,
        week_title: weekTitle,
        dod_criteria: dodCriteria,
      });

      setReviewResult(data);

      await supabase.from('homeworks').insert({
        student_id: studentId,
        week_id: weekId,
        code_html: html,
        code_css: css,
        code_js: js,
        score: data.score,
        review_text: data.review_text,
        status: data.score >= 80 ? 'approved' : 'rejected',
        submitted_at: new Date().toISOString(),
      });

      if (data.score >= 80) {
        onHomeworkApproved();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Gemini API недоступен';
      alert(`Ошибка проверки ИИ: ${errMsg}`);
    } finally {
      setLoadingReview(false);
    }
  };

  return (
    <div className="ide-sandbox-wrapper">
      {/* Editor & Preview Split Workspace */}
      <div className="ide-workspace-split">
        {/* Monaco Editor Panel */}
        <div className="editor-side glass-panel">
          <div className="editor-tabs-header">
            <div className="tab-buttons">
              <button
                onClick={() => setActiveTab('html')}
                className={`tab-btn ${activeTab === 'html' ? 'active html' : ''}`}
              >
                <FileCode size={14} /> index.html
              </button>
              <button
                onClick={() => setActiveTab('css')}
                className={`tab-btn ${activeTab === 'css' ? 'active css' : ''}`}
              >
                <FileCode size={14} /> styles.css
              </button>
              <button
                onClick={() => setActiveTab('js')}
                className={`tab-btn ${activeTab === 'js' ? 'active js' : ''}`}
              >
                <FileCode size={14} /> main.js
              </button>
            </div>

            <div className="editor-controls">
              <button onClick={handleResetTemplate} className="btn btn-secondary btn-sm" title="Сбросить код">
                <RefreshCw size={12} />
              </button>
              <button onClick={handleRunCode} className="btn btn-secondary btn-sm" title="Запустить код">
                <Play size={12} /> Запуск
              </button>
            </div>
          </div>

          <div className="monaco-container">
            <Editor
              height="100%"
              language={activeLanguage}
              theme="vs-dark"
              value={activeCode}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Fira Code, monospace',
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Live Preview Iframe */}
        <div className="preview-side glass-panel">
          <div className="preview-header">
            <span className="live-badge animate-pulse">LIVE PREVIEW</span>
            <span className="preview-label">Секция Вывода (Iframe)</span>
          </div>
          <div className="iframe-wrapper">
            <iframe
              srcDoc={previewDoc}
              title="Live Code Preview"
              sandbox="allow-scripts"
              className="preview-iframe"
            />
          </div>
        </div>
      </div>

      {/* Homework Action Panel */}
      <div className="homework-action-bar glass-panel glow-border-cyan">
        <div className="action-text">
          <h4>Готовы сдать ДЗ?</h4>
          <p>ИИ проверит ваш HTML/CSS/JS на соответствие критериям DoD (необходима оценка не менее 80%).</p>
        </div>
        <button
          onClick={handleSendHomework}
          disabled={loadingReview}
          className="btn btn-primary"
        >
          {loadingReview ? (
            <span>Запрос к ИИ Gemini...</span>
          ) : (
            <>
              <Send size={16} /> Проверить домашнюю работу
            </>
          )}
        </button>
      </div>

      {/* Gemini AI Grading Response */}
      {reviewResult && (
        <div className={`ai-review-report glass-panel animate-fade-in ${reviewResult.score >= 80 ? 'approved' : 'rejected'}`}>
          <div className="report-header">
            <div className="grade-badge">
              <span>{reviewResult.score} / 100</span>
              <span className="grade-label">Оценка ИИ</span>
            </div>
            <div className="report-status-text">
              {reviewResult.score >= 80 ? (
                <div className="status-indicator success">
                  <CheckCircle size={18} />
                  <span>Домашняя работа зачтена!</span>
                </div>
              ) : (
                <div className="status-indicator error">
                  <AlertCircle size={18} />
                  <span>Не зачтено. Доработайте по рекомендациям.</span>
                </div>
              )}
            </div>
          </div>

          <div className="report-body">
            <div className="report-summary-comments">
              <h5>Рекомендации Gemini:</h5>
              <ul>
                {reviewResult.comments.map((comment, index) => (
                  <li key={index}>{comment}</li>
                ))}
              </ul>
            </div>

            <div className="report-markdown-review">
              <h5>Подробное Ревью Кода:</h5>
              <div className="markdown-viewport">
                {reviewResult.review_text.split('\n').map((line, idx) => {
                  if (line.startsWith('###')) {
                    return <h4 key={idx} style={{ margin: '1rem 0 0.5rem 0', color: 'var(--text-primary)' }}>{line.replace(/###/g, '').trim()}</h4>;
                  } else if (line.startsWith('-')) {
                    return <li key={idx} style={{ marginLeft: '1.25rem', color: 'var(--text-secondary)' }}>{line.substring(1).trim()}</li>;
                  }
                  return <p key={idx} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{line}</p>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

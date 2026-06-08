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
    case 1:
      return {
        html: `<div class="testimonials-container">\n  <h2>Отзывы студентов</h2>\n  <div class="reviews-grid" id="reviews-grid">\n    <!-- Карточки отзывов будут здесь -->\n  </div>\n</div>`,
        css: `:root {\n  --primary: #00F2FE;\n  --bg: #121824;\n  --text: #ffffff;\n}\n\n.testimonials-container {\n  background: var(--bg);\n  color: var(--text);\n  padding: 2rem;\n  font-family: system-ui, sans-serif;\n  border-radius: 8px;\n  border: 1px solid rgba(255,255,255,0.1);\n}\n\n.reviews-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 1rem;\n  margin-top: 1rem;\n}`,
        js: `const reviews = [\n  { name: "Дмитрий", text: "Отличный упор на практику и цели G1-G4!", rating: 5 },\n  { name: "Анна", text: "Вайбкодинг наконец-то стал структурированным.", rating: 5 }\n];\n\nconst grid = document.getElementById('reviews-grid');\ngrid.innerHTML = reviews.map(r => \`\n  <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:6px; border:1px solid rgba(255,255,255,0.05)">\n    <h4 style="margin:0 0 0.5rem 0; color:var(--primary)">\${r.name}</h4>\n    <p style="margin:0; font-size:0.9rem; opacity:0.8">\${r.text}</p>\n  </div>\n\`).join('');`
      };
    case 3:
      return {
        html: `<div class="form-container">\n  <h3>Подписка на Закрытый Клуб</h3>\n  <form id="newsletter-form">\n    <input type="email" id="email" placeholder="Введите ваш email" required />\n    <button type="submit" id="submit-btn">Получить доступ</button>\n  </form>\n  <div id="status-message"></div>\n</div>`,
        css: `.form-container {\n  padding: 2rem;\n  background: #182030;\n  color: #fff;\n  border-radius: 8px;\n  max-width: 400px;\n  margin: 2rem auto;\n  font-family: sans-serif;\n}\n\ninput {\n  width: 100%;\n  padding: 0.75rem;\n  margin-bottom: 1rem;\n  border-radius: 4px;\n  border: 1px solid rgba(255,255,255,0.1);\n  background: #090D16;\n  color: #fff;\n}\n\nbutton {\n  width: 100%;\n  padding: 0.75rem;\n  background: linear-gradient(135deg, #00F2FE 0%, #9B5DE5 100%);\n  color: #fff;\n  border: none;\n  border-radius: 4px;\n  cursor: pointer;\n}`,
        js: `const form = document.getElementById('newsletter-form');\nconst status = document.getElementById('status-message');\n\nform.addEventListener('submit', (e) => {\n  e.preventDefault();\n  const email = document.getElementById('email').value;\n  \n  // Валидация\n  if (email.includes('@')) {\n    status.innerHTML = '<span style="color:#10B981">Успешно! Доступ отправлен на почту.</span>';\n  } else {\n    status.innerHTML = '<span style="color:#EF4444">Ошибка: некорректный email.</span>';\n  }\n});`
      };
    default:
      return {
        html: `<div class="sandbox-app">\n  <h2>Практическое задание: Неделя ${weekId}</h2>\n  <p>Редактируйте HTML, CSS и JS, чтобы увидеть изменения живьем.</p>\n  <div id="output-box"></div>\n</div>`,
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

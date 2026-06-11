// Интерактивный вводный тур «Vibe-Coding Onboarding» (7–10 минут).
// Студент проходит три роли вайб-кодера на живом мини-проекте:
// Автор идеи → Режиссёр (промпт) → Редактор (аудит диффа) →
// выход из тупика (Loop Breaker) → AI-грейдинг и релиз.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  FileCode,
  Send,
  AlertOctagon,
  Award,
  Download,
  RotateCcw,
  Rocket,
  CheckCircle,
  XCircle,
  Sparkles,
  TerminalSquare,
  X,
} from 'lucide-react';
import { useTourStore } from '../../tour/tourStore';
import { tourTemplates, getTourTemplate } from '../../tour/tourTemplates';
import { TOUR_STEP_ORDER, TOUR_STEP_LABELS } from '../../tour/tourTypes';
import type { TourStepId } from '../../tour/tourTypes';
import { Spotlight } from './Spotlight';
import type { SpotlightConfig } from './Spotlight';
import { DiffAuditor } from './DiffAuditor';
import { buildSandboxDoc, useSandboxConsole, runFunctionalTests } from '../../lib/consoleBridge';
import { trackTourEvent } from '../../lib/analytics';
import type { UserProfile } from '../../types';
import './Tour.css';

const BRIDGE_ID = 'tour-sandbox';

interface TourPageProps {
  userProfile: UserProfile | null;
}

export const TourPage: React.FC<TourPageProps> = ({ userProfile }) => {
  const navigate = useNavigate();
  const store = useTourStore();
  const template = getTourTemplate(store.templateId);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { entries, errors, clear } = useSandboxConsole(BRIDGE_ID);

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('js');
  const [dismissedSpot, setDismissedSpot] = useState<string | null>(null);
  const [debugPhase, setDebugPhase] = useState<'console' | 'breaker'>('console');
  const [gradeRunning, setGradeRunning] = useState(false);

  const srcDoc = useMemo(
    () => (template ? buildSandboxDoc(store.files, BRIDGE_ID) : ''),
    [store.files, template],
  );

  // Новая сборка песочницы → чистая консоль
  useEffect(() => {
    clear();
  }, [srcDoc, clear]);

  // Воронка: тур открыт
  useEffect(() => {
    trackTourEvent(store.currentStep, 'tour_viewed', {}, userProfile?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Шаг 4: сначала подсвечиваем красную консоль, через пару секунд — Кнопку Паники
  useEffect(() => {
    if (store.currentStep === 'DEBUG_ERROR') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDebugPhase('console');
      const timer = setTimeout(() => setDebugPhase('breaker'), 2600);
      return () => clearTimeout(timer);
    }
  }, [store.currentStep]);

  // Смена шага сбрасывает скрытый тултип
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedSpot(null);
  }, [store.currentStep, store.pendingDiff, store.isDiffApproved, debugPhase]);

  // Автоскролл чата
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.chat.length, store.generating]);

  const spotlight: SpotlightConfig | null = useMemo(() => {
    if (store.generating || gradeRunning) return null;
    switch (store.currentStep) {
      case 'SELECT_PROJECT':
        return {
          targetKey: 'templates',
          title: 'Шаг 1 · Роль: Автор идеи',
          text: 'Вайб-кодер начинает не с кода, а с рамок MVP и ценности. Выбери проект — ИИ мгновенно соберёт Project Brief и стартовый макет.',
        };
      case 'WRITE_PROMPT':
        return {
          targetKey: 'prompt-input',
          title: 'Шаг 2 · Роль: Режиссёр',
          text: `Опиши ИИ задачу: что должно происходить и с какими элементами (${template?.requiredIds.join(', ')}). Слабый промпт перехватит Prompt Linter.`,
        };
      case 'AUDIT_DIFF':
        if (store.pendingDiff) {
          return {
            targetKey: 'diff-auditor',
            title: 'Шаг 3 · Роль: Редактор',
            text: 'ИИ не пишет в файлы напрямую. Проверь подсвеченные строки: правильные ли ID он использовал? Затем нажми «Утвердить».',
          };
        }
        if (store.isDiffApproved) {
          return {
            targetKey: 'preview',
            title: 'Проверь результат вживую',
            text: 'Превью обновилось — поиграй со своим проектом! Когда убедишься, что всё работает, жми «Дальше»: покажу тёмную сторону вайб-кодинга.',
            actionLabel: 'Дальше →',
            onAction: store.triggerSimulatedError,
          };
        }
        return null;
      case 'DEBUG_ERROR':
        return debugPhase === 'console'
          ? {
              targetKey: 'console',
              title: 'Шаг 4 · Симуляция: превью сломалось',
              text: `Это обучающая симуляция. В консоли горит «${template?.brokenErrorHint}» — так выглядит тупик, в который попадает каждый вайб-кодер.`,
            }
          : {
              targetKey: 'loop-breaker',
              title: 'Loop Breaker — Кнопка Паники',
              text: 'Не пиши ИИ «исправь это» — в захламлённом контексте он ходит по кругу. Сбрось контекст: система откатит код к рабочему снапшоту и отдаст ИИ только лог ошибки.',
            };
      case 'RUN_GRADER':
        if (store.graderReport && !store.graderReport.passed) return null;
        return {
          targetKey: 'grader-btn',
          title: 'Шаг 5 · Релиз и сертификация',
          text: 'AI-грейдер прогонит функциональные тесты прямо в песочнице и сверит работу с Definition of Done. Жми!',
        };
      default:
        return null;
    }
  }, [
    store.currentStep,
    store.pendingDiff,
    store.isDiffApproved,
    store.generating,
    store.graderReport,
    store.triggerSimulatedError,
    gradeRunning,
    debugPhase,
    template,
  ]);

  const activeSpot = spotlight && dismissedSpot === spotlight.targetKey ? null : spotlight;

  const handleGrade = useCallback(async () => {
    if (!template || gradeRunning) return;
    setGradeRunning(true);
    trackTourEvent('RUN_GRADER', 'grader_started', {}, userProfile?.id);
    const functionalResults = await runFunctionalTests(
      iframeRef.current,
      BRIDGE_ID,
      template.functionalTests,
    );
    store.runGrader(functionalResults, errors.length);
    setGradeRunning(false);
  }, [template, gradeRunning, errors.length, store, userProfile?.id]);

  const handleDownloadArtifact = useCallback(() => {
    if (!template) return;
    const standalone = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${template.title} — собрано на Centras CodeAI</title>
    <style>
      body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }
      ${store.files.css}
    </style>
  </head>
  <body>
    ${store.files.html}
    <script>${store.files.js}</script>
  </body>
</html>`;
    const blob = new Blob([standalone], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}-vibe-project.html`;
    a.click();
    URL.revokeObjectURL(url);
    trackTourEvent('TOUR_COMPLETED', 'artifact_downloaded', { templateId: template.id }, userProfile?.id);
  }, [template, store.files, userProfile?.id]);

  const handleSkip = useCallback(() => {
    trackTourEvent(store.currentStep, 'tour_skipped', {}, userProfile?.id);
    navigate('/');
  }, [store.currentStep, navigate, userProfile?.id]);

  const stepIndex = TOUR_STEP_ORDER.indexOf(store.currentStep);

  const tabContent =
    activeTab === 'html' ? store.files.html : activeTab === 'css' ? store.files.css : store.files.js;
  const tabLanguage = activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript';
  const jsEditable = store.currentStep === 'RUN_GRADER' && activeTab === 'js';

  // ───────────────────────── Финальный экран ─────────────────────────
  if (store.currentStep === 'TOUR_COMPLETED' && store.graderReport) {
    const durationMin =
      store.startedAt && store.completedAt
        ? Math.max(1, Math.round((store.completedAt - store.startedAt) / 60000))
        : null;
    return (
      <div className="tour-completed-screen animate-fade-in">
        <div className="completed-card glass-panel glow-border-cyan">
          <Award size={64} className="completed-badge-icon" />
          <h1>Бейдж получен: Младший Вайб-кодер</h1>
          <p className="completed-score">
            Оценка AI-грейдера: <strong>{store.graderReport.score} / 100</strong>
            {durationMin ? ` · пройдено за ~${durationMin} мин` : ''}
          </p>
          <ul className="completed-feedback">
            {store.graderReport.feedback.map((f, i) => (
              <li key={i}>
                <CheckCircle size={14} className="success-color" /> {f}
              </li>
            ))}
          </ul>
          <p className="completed-roles">
            Ты побывал во всех трёх ролях: <strong>Автор идеи</strong> → <strong>Режиссёр</strong> →{' '}
            <strong>Редактор</strong> — и вышел из настоящего тупика отладки.
          </p>
          <div className="completed-actions">
            <button className="btn btn-primary" onClick={handleDownloadArtifact}>
              <Download size={16} /> Скачать мой проект (HTML)
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate(userProfile ? '/slides' : '/auth')}
            >
              <Rocket size={16} /> {userProfile ? 'Начать полный курс' : 'Создать аккаунт и начать курс'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                store.resetTour();
              }}
            >
              <RotateCcw size={16} /> Пройти тур заново
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── Основной макет тура ─────────────────────────
  return (
    <div className="tour-page">
      <Spotlight config={activeSpot} onDismiss={() => setDismissedSpot(spotlight?.targetKey ?? null)} />

      {/* Шапка: прогресс из 5 шагов + выход */}
      <header className="tour-header glass-panel">
        <div className="tour-progress">
          {TOUR_STEP_ORDER.slice(0, 5).map((step, i) => (
            <div
              key={step}
              className={`tour-progress-step ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'active' : ''}`}
            >
              <span className="step-dot">{i < stepIndex ? '✓' : i + 1}</span>
              <span className="step-label">{TOUR_STEP_LABELS[step as TourStepId]}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm tour-skip-btn" onClick={handleSkip}>
          <X size={14} /> Пропустить тур
        </button>
      </header>

      <div className="tour-layout">
        {/* ───── Левая панель: сценарий шага ───── */}
        <div className="tour-left">
          {store.currentStep === 'SELECT_PROJECT' && (
            <div className="tour-panel glass-panel" data-tour-spot="templates">
              <h2>
                <Sparkles size={20} /> С чего начнём?
              </h2>
              <p className="tour-panel-sub">
                За ближайшие ~10 минут ты соберёшь работающий мини-проект вместе с ИИ — и прочувствуешь
                все три роли вайб-кодера.
              </p>
              <div className="template-grid">
                {tourTemplates.map((t) => (
                  <button key={t.id} className="template-card" onClick={() => store.selectProject(t.id)}>
                    <span className="template-emoji">{t.emoji}</span>
                    <span className="template-title">{t.title}</span>
                    <span className="template-tagline">{t.tagline}</span>
                  </button>
                ))}
              </div>
              <p className="template-custom-note">
                Своя идея? Отлично — её ты реализуешь в полном курсе, а тур быстрее пройти на шаблоне.
              </p>
            </div>
          )}

          {store.currentStep !== 'SELECT_PROJECT' && (
            <div className="tour-panel glass-panel tour-chat-panel">
              <div className="tour-chat-header">
                <h3>ИИ-ассистент</h3>
                {template && <span className="tour-project-badge">{template.emoji} {template.title}</span>}
              </div>

              <div className="tour-chat-messages">
                {store.chat.map((msg, i) => (
                  <div key={i} className={`chat-msg chat-${msg.role}`}>
                    {msg.text.split('\n').map((line, j) =>
                      line.startsWith('##') ? (
                        <h4 key={j}>{line.replace(/#/g, '').trim()}</h4>
                      ) : line.startsWith('**') && line.endsWith('**') ? (
                        <p key={j}>
                          <strong>{line.replace(/\*\*/g, '')}</strong>
                        </p>
                      ) : (
                        <p key={j}>{line.replace(/\*\*/g, '')}</p>
                      ),
                    )}
                  </div>
                ))}
                {store.generating && (
                  <div className="chat-msg chat-ai chat-typing">
                    <span className="typing-dots">ИИ думает…</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Шаг 2: ввод промпта + линтер */}
              {store.currentStep === 'WRITE_PROMPT' && (
                <div className="tour-prompt-area" data-tour-spot="prompt-input">
                  {store.lintResult && !store.lintResult.ok && (
                    <div className="lint-warnings animate-fade-in">
                      <h5>🔍 Prompt Linter:</h5>
                      {store.lintResult.issues.map((issue, i) => (
                        <p key={i} className="lint-issue">{issue}</p>
                      ))}
                      {store.lintResult.hints.map((hint, i) => (
                        <p key={i} className="lint-hint">💡 {hint}</p>
                      ))}
                      {template && store.lintAttempts >= 2 && (
                        <p className="lint-example">
                          Пример сильного промпта: <em>{template.examplePrompt}</em>
                        </p>
                      )}
                    </div>
                  )}
                  <textarea
                    value={store.promptDraft}
                    onChange={(e) => store.setPromptDraft(e.target.value)}
                    placeholder={`Например: добавь так, чтобы при клике на ${template?.requiredIds[0] ?? '#кнопку'}…`}
                    rows={4}
                    disabled={store.generating}
                  />
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => void store.submitPrompt()}
                    disabled={store.generating || !store.promptDraft.trim()}
                  >
                    <Send size={15} /> {store.generating ? 'ИИ генерирует код…' : 'Отправить ИИ'}
                  </button>
                </div>
              )}

              {/* Шаг 3: дифф-аудит */}
              {store.currentStep === 'AUDIT_DIFF' && store.pendingDiff && (
                <DiffAuditor
                  original={store.pendingDiff.original}
                  modified={store.pendingDiff.modified}
                  explanation={store.pendingDiff.explanation}
                  fromLiveAi={store.pendingDiff.fromLiveAi}
                  onApprove={store.approveDiff}
                  onReject={store.rejectDiff}
                />
              )}

              {store.currentStep === 'AUDIT_DIFF' && !store.pendingDiff && store.isDiffApproved && (
                <div className="tour-next-area">
                  <button className="btn btn-primary w-full" onClick={store.triggerSimulatedError}>
                    Дальше →
                  </button>
                </div>
              )}

              {/* Шаг 4: Loop Breaker */}
              {store.currentStep === 'DEBUG_ERROR' && (
                <div className="tour-panic-area" data-tour-spot="loop-breaker">
                  <button
                    className="loop-breaker-btn"
                    onClick={() => void store.activateLoopBreaker()}
                    disabled={store.generating}
                  >
                    <AlertOctagon size={22} />
                    {store.generating ? 'Сбрасываю контекст…' : 'КНОПКА ПАНИКИ — сбросить контекст'}
                  </button>
                  <p className="panic-note">
                    Откат к рабочему снапшоту + чистый контекст + ИИ получает только лог ошибки.
                  </p>
                </div>
              )}

              {/* Шаг 5: грейдер */}
              {store.currentStep === 'RUN_GRADER' && template && (
                <div className="tour-grader-area">
                  {store.loopBreakerExplanation && (
                    <div className="loop-result-card">
                      <h5>🔧 Заплатка Loop Breaker-а:</h5>
                      <p>{store.loopBreakerExplanation}</p>
                    </div>
                  )}
                  <div className="rubric-list">
                    <h5>Definition of Done:</h5>
                    {template.rubric.map((c, i) => {
                      const result = store.graderReport?.rubricResults[i];
                      return (
                        <div key={i} className={`rubric-item ${result ? (result.passed ? 'pass' : 'fail') : ''}`}>
                          {result ? (
                            result.passed ? (
                              <CheckCircle size={14} className="success-color" />
                            ) : (
                              <XCircle size={14} className="error-color" />
                            )
                          ) : (
                            <span className="rubric-bullet">•</span>
                          )}
                          <span>{c}</span>
                        </div>
                      );
                    })}
                  </div>
                  {store.graderReport && !store.graderReport.passed && (
                    <div className="grader-feedback animate-fade-in">
                      <h5>Грейдер: {store.graderReport.score}/100 — пока не зачтено</h5>
                      {store.graderReport.feedback.map((f, i) => (
                        <p key={i}>{f}</p>
                      ))}
                    </div>
                  )}
                  <button
                    className="btn btn-primary w-full"
                    data-tour-spot="grader-btn"
                    onClick={() => void handleGrade()}
                    disabled={gradeRunning}
                  >
                    {gradeRunning ? 'Гоняю тесты в песочнице…' : 'Проверить решение'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ───── Правая панель: песочница ───── */}
        <div className="tour-right">
          <div className="tour-sandbox glass-panel">
            <div className="sandbox-tabs">
              {(['html', 'css', 'js'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`tab-btn ${activeTab === tab ? `active ${tab}` : ''}`}
                >
                  <FileCode size={13} />
                  {tab === 'html' ? 'index.html' : tab === 'css' ? 'styles.css' : 'app.js'}
                </button>
              ))}
              {jsEditable && <span className="editable-hint">✏️ можно править</span>}
            </div>
            <div className="tour-monaco">
              <Editor
                height="100%"
                language={tabLanguage}
                theme="vs-dark"
                value={tabContent}
                onChange={(value) => {
                  if (jsEditable) store.setJs(value || '');
                }}
                options={{
                  readOnly: !jsEditable,
                  minimap: { enabled: false },
                  fontSize: 12.5,
                  fontFamily: 'Fira Code, monospace',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          <div className="tour-preview-row">
            <div className="tour-preview glass-panel" data-tour-spot="preview">
              <div className="preview-header">
                <span className="live-badge">LIVE</span>
                <span>Превью</span>
              </div>
              {template ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={srcDoc}
                  title="Песочница тура"
                  sandbox="allow-scripts"
                  className="tour-iframe"
                />
              ) : (
                <div className="preview-placeholder">Выбери проект — здесь появится превью</div>
              )}
            </div>

            <div
              className={`tour-console glass-panel ${errors.length ? 'has-errors' : ''}`}
              data-tour-spot="console"
            >
              <div className="console-header">
                <TerminalSquare size={14} />
                <span>Консоль</span>
                {errors.length > 0 && <span className="console-error-count">{errors.length} ошибка(и)</span>}
              </div>
              <div className="console-body">
                {entries.length === 0 && <p className="console-empty">— пусто —</p>}
                {entries.map((entry, i) => (
                  <p key={i} className={`console-line console-${entry.level}`}>
                    {entry.level === 'error' ? '✖ ' : ''}
                    {entry.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

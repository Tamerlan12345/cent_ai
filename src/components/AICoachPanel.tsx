import React, { useState, useRef, useEffect } from 'react';
import { Bot, Copy, MessageSquareWarning, X, CheckCircle2, Circle } from 'lucide-react';
import './CodeEditor.css'; // Переиспользуем стили или потом вынесем

const CHEAT_SHEET_TEMPLATES = [
  {
    title: 'Поиск ошибки',
    text: 'У меня возникает следующая ошибка: [ВСТАВИТЬ ОШИБКУ]. Объясни простым языком, почему она происходит, и как мне её исправить. Код пока не меняй — сначала анализ.',
  },
  {
    title: 'Добавить стиль (UI-pairing)',
    text: 'Добавь CSS-стили для [ЭЛЕМЕНТ] в @styles.css. Используй CSS-переменные из :root, скруглённые углы, плавный hover. Никаких новых классов.',
  },
  {
    title: 'Адаптивность',
    text: 'Сделай страницу адаптивной для мобильных (ширина 375). Используй flexbox/grid, не трогай существующие classNames. Diff только в @styles.css.',
  },
  {
    title: 'Объясни код (Mentor mode)',
    text: 'Ты — преподаватель. Объясни строка за строкой этот фрагмент, как новичку без программирования: [ВСТАВИТЬ КОД]. Никаких правок.',
  },
  {
    title: 'Project X-Ray',
    text: 'Изучи проект и ничего не меняй. Сделай рентген: стек, точка входа, маршруты, данные, риски, 5 первых задач.',
  },
  {
    title: 'Red Team (QA-агент)',
    text: 'Ты — вредный QA. Найди XSS, edge-cases, дыры безопасности в @main.js. Таблица: Проблема | Воспроизвести | Риск | Как фиксить. Код не меняй.',
  },
];

interface AgentStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
  diffPreview?: string;
}

const AGENT_PLANS: { id: string; title: string; steps: AgentStep[] }[] = [
  {
    id: 'plan-refactor',
    title: 'Рефакторинг без изменения поведения',
    steps: [
      { id: 's1', label: 'Прочитать @AGENTS.md и @main.js', status: 'pending' },
      { id: 's2', label: 'Найти мёртвые переменные и лишние console.log', status: 'pending' },
      { id: 's3', label: 'Вынести магические числа в константы', status: 'pending' },
      { id: 's4', label: 'Добавить JSDoc к ключевым функциям', status: 'pending' },
      { id: 's5', label: 'Открыть превью, убедиться, что поведение то же', status: 'pending' },
      { id: 's6', label: 'Артефакт: скриншот превью «до/после»', status: 'pending' },
    ],
  },
  {
    id: 'plan-xss',
    title: 'Закрыть XSS в renderHabits',
    steps: [
      { id: 's1', label: 'Найти все innerHTML с пользовательским вводом', status: 'pending' },
      { id: 's2', label: 'Добавить функцию escapeHtml в @main.js', status: 'pending' },
      { id: 's3', label: 'Применить escapeHtml ко всем небезопасным вставкам', status: 'pending' },
      { id: 's4', label: 'Прогнать TEST_PLAN: <script>, <img onerror>', status: 'pending' },
      { id: 's5', label: 'Снапшот «security-fix-xss»', status: 'pending' },
    ],
  },
  {
    id: 'plan-xray',
    title: 'Project X-Ray (изучить проект, не меняя)',
    steps: [
      { id: 's1', label: 'Прочитать структуру файлов', status: 'pending' },
      { id: 's2', label: 'Определить стек и точку входа', status: 'pending' },
      { id: 's3', label: 'Найти главные сущности данных', status: 'pending' },
      { id: 's4', label: 'Найти риски и устаревшие практики', status: 'pending' },
      { id: 's5', label: 'Артефакт: карта проекта на 1 страницу', status: 'pending' },
    ],
  },
];

interface AICoachPanelProps {
  iframeError: string | null;
  onClearError: () => void;
  showCheatSheet: boolean;
  onToggleCheatSheet: () => void;
  agentOpen: boolean;
  onToggleAgent: () => void;
}

export const AICoachPanel: React.FC<AICoachPanelProps> = ({
  iframeError,
  onClearError,
  showCheatSheet,
  onToggleCheatSheet,
  agentOpen,
  onToggleAgent
}) => {
  const [activePlanId, setActivePlanId] = useState<string>(AGENT_PLANS[0].id);
  const [planSteps, setPlanSteps] = useState<AgentStep[]>(AGENT_PLANS[0].steps);
  const [agentRunning, setAgentRunning] = useState(false);
  const planTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (planTimerRef.current) {
        window.clearTimeout(planTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const plan = AGENT_PLANS.find((p) => p.id === activePlanId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (plan) setPlanSteps(plan.steps.map((s) => ({ ...s, status: 'pending' })));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAgentRunning(false);
    if (planTimerRef.current) window.clearTimeout(planTimerRef.current);
  }, [activePlanId]);

  const handleStartAgentPlan = () => {
    if (agentRunning) return;
    setAgentRunning(true);
    let idx = 0;
    const advance = () => {
      setPlanSteps((prev) => {
        const next = [...prev];
        if (idx > 0) next[idx - 1] = { ...next[idx - 1], status: 'done' };
        if (idx < next.length) next[idx] = { ...next[idx], status: 'active' };
        return next;
      });
      if (idx < planSteps.length) {
        idx += 1;
        planTimerRef.current = window.setTimeout(advance, 900);
      } else {
        setAgentRunning(false);
        setPlanSteps((prev) =>
          prev.map((s) => (s.status === 'active' ? { ...s, status: 'done' } : s)),
        );
      }
    };
    advance();
  };

  const handleResetAgentPlan = () => {
    const plan = AGENT_PLANS.find((p) => p.id === activePlanId);
    if (plan) setPlanSteps(plan.steps.map((s) => ({ ...s, status: 'pending' })));
    setAgentRunning(false);
    if (planTimerRef.current) window.clearTimeout(planTimerRef.current);
  };

  if (!iframeError && !showCheatSheet && !agentOpen) {
    return null;
  }

  return (
    <div className="ai-coach-panel">
      {/* Error Analyzer Panel */}
      {iframeError && (
        <div className="error-analyzer-panel animate-fade-in" style={{ marginBottom: '1rem' }}>
          <div className="error-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquareWarning size={16} />
              <strong>Анализатор ошибок</strong>
            </div>
            <button className="close-btn" onClick={onClearError}>
              &times;
            </button>
          </div>
          <div className="error-body">
            <p className="error-text">
              <code>{iframeError}</code>
            </p>
            <p className="suggestion-text">Спросите ИИ, как это исправить:</p>
            <div className="prompt-suggestion">
              <code>Помоги исправить ошибку: "{iframeError}". Объясни шаг за шагом, что пошло не так, без кода.</code>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `Помоги исправить ошибку: "${iframeError}". Объясни шаг за шагом, что пошло не так, без кода.`
                  )
                }
                className="copy-btn"
                title="Скопировать промпт"
              >
                <Copy size={14} /> Копировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cheat Sheet Sidebar */}
      {showCheatSheet && (
        <div className="cheat-sheet-panel animate-slide-in" style={{ position: 'relative', width: '100%', right: 'auto', bottom: 'auto', marginBottom: '1rem' }}>
          <div className="cheat-sheet-header">
            <h5>Шпаргалка промптов</h5>
            <button onClick={onToggleCheatSheet} className="close-btn">
              &times;
            </button>
          </div>
          <div className="cheat-sheet-list">
            {CHEAT_SHEET_TEMPLATES.map((tmpl, idx) => (
              <div key={idx} className="cheat-template">
                <div className="cheat-template-title">{tmpl.title}</div>
                <div className="cheat-template-body">
                  <span className="tmpl-text">{tmpl.text}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(tmpl.text)}
                    className="copy-btn"
                    title="Скопировать шаблон"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Manager Simulation */}
      {agentOpen && (
        <div className="agent-manager-panel animate-slide-in" style={{ position: 'relative', width: '100%', right: 'auto', bottom: 'auto' }}>
          <div className="agent-manager-header">
            <div className="agent-manager-title">
              <Bot size={16} />
              <strong>Antigravity Manager (симуляция)</strong>
            </div>
            <button onClick={onToggleAgent} className="close-btn" aria-label="Закрыть">
              <X size={16} />
            </button>
          </div>
          <div className="agent-manager-body">
            <label className="agent-plan-select-label">
              План агента:
              <select
                value={activePlanId}
                onChange={(e) => setActivePlanId(e.target.value)}
                className="agent-plan-select"
              >
                {AGENT_PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>

            <ol className="agent-steps-list">
              {planSteps.map((step) => (
                <li key={step.id} className={`agent-step \${step.status}`}>
                  <span className="agent-step-icon">
                    {step.status === 'done' ? (
                      <CheckCircle2 size={14} />
                    ) : step.status === 'active' ? (
                      <Bot size={14} />
                    ) : (
                      <Circle size={14} />
                    )}
                  </span>
                  <span className="agent-step-label">{step.label}</span>
                </li>
              ))}
            </ol>

            <div className="agent-manager-actions">
              <button
                onClick={handleStartAgentPlan}
                disabled={agentRunning}
                className="btn btn-primary btn-sm"
              >
                {agentRunning ? 'Агент работает…' : 'Запустить план'}
              </button>
              <button onClick={handleResetAgentPlan} className="btn btn-secondary btn-sm">
                Сбросить
              </button>
            </div>

            <p className="agent-manager-hint">
              Это симуляция workflow Antigravity Manager. Реальные агенты появятся, когда вы установите Antigravity локально после курса.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

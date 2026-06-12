import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Circle,
  Copy,
  MessageSquare,
  MessageSquareWarning,
  Send,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import './CodeEditor.css';

type CoachModeId = 'mentor' | 'architect' | 'builder' | 'reviewer' | 'security' | 'qa';
type ModelPresetId = 'fast' | 'balanced' | 'deep' | 'critic';

interface CoachMode {
  id: CoachModeId;
  label: string;
  desc: string;
  steps: string[];
}

interface ModelPreset {
  id: ModelPresetId;
  label: string;
  desc: string;
}

interface AgentStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
}

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
}

const COACH_MODES: CoachMode[] = [
  {
    id: 'mentor',
    label: 'Наставник',
    desc: 'Объясняет простыми словами без лишнего кода.',
    steps: ['Понять цель шага', 'Объяснить незнакомые слова', 'Подсказать следующее действие'],
  },
  {
    id: 'architect',
    label: 'Архитектор',
    desc: 'Помогает спроектировать файлы, данные и риски.',
    steps: ['Проверить контекст', 'Разбить задачу на части', 'Назвать границы изменения'],
  },
  {
    id: 'builder',
    label: 'Builder',
    desc: 'Готовит маленький diff под текущий файл.',
    steps: ['Выбрать один файл', 'Сделать минимальную правку', 'Запустить Preview'],
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    desc: 'Ищет баги, regressions и лишние изменения.',
    steps: ['Сравнить DoD и результат', 'Проверить edge cases', 'Предложить точечный fix'],
  },
  {
    id: 'security',
    label: 'Security',
    desc: 'Проверяет XSS, секреты, ввод пользователя и sandbox.',
    steps: ['Найти ввод пользователя', 'Проверить опасный рендер', 'Сформулировать безопасную замену'],
  },
  {
    id: 'qa',
    label: 'QA',
    desc: 'Собирает ручной тест-план и сценарии проверки.',
    steps: ['Описать happy path', 'Добавить негативный сценарий', 'Зафиксировать результат'],
  },
];

const MODEL_PRESETS: ModelPreset[] = [
  { id: 'fast', label: 'Быстрая', desc: 'короткая подсказка' },
  { id: 'balanced', label: 'Умная', desc: 'баланс скорости и качества' },
  { id: 'deep', label: 'Глубокое рассуждение', desc: 'для сложного бага или архитектуры' },
  { id: 'critic', label: 'Критик', desc: 'жесткое ревью перед сдачей' },
];

const CHEAT_SHEET_TEMPLATES = [
  {
    title: 'Ошибка в Preview',
    text: 'Объясни ошибку простыми словами. Сначала причина, потом 3 шага исправления. Код пока не меняй.',
  },
  {
    title: 'Маленький diff',
    text: 'Сделай минимальную правку только в текущем файле. Не меняй архитектуру, стили и имена без причины.',
  },
  {
    title: 'Diff review',
    text: 'Проверь предложенный diff: что улучшилось, что может сломаться, какие тесты надо запустить.',
  },
  {
    title: 'Project X-Ray',
    text: 'Изучи проект без изменений. Дай карту файлов, главный поток данных, риски и 5 первых задач.',
  },
  {
    title: 'Security check',
    text: 'Найди XSS, небезопасный innerHTML, секреты и опасную работу с localStorage. Код не меняй.',
  },
];

const AGENT_PLANS: { id: string; title: string; steps: AgentStep[] }[] = [
  {
    id: 'plan-xray',
    title: 'Project X-Ray без изменений',
    steps: [
      { id: 's1', label: 'Прочитать context/AGENTS.md и PROJECT_BRIEF.md', status: 'pending' },
      { id: 's2', label: 'Понять файлы index.html, styles.css, main.js', status: 'pending' },
      { id: 's3', label: 'Назвать главный пользовательский сценарий', status: 'pending' },
      { id: 's4', label: 'Найти риски и неизвестные места', status: 'pending' },
      { id: 's5', label: 'Сформировать план на один маленький diff', status: 'pending' },
    ],
  },
  {
    id: 'plan-fix',
    title: 'Fix loop: ошибка -> причина -> diff -> check',
    steps: [
      { id: 's1', label: 'Считать ошибку из Problems', status: 'pending' },
      { id: 's2', label: 'Объяснить причину без правок', status: 'pending' },
      { id: 's3', label: 'Исправить один участок кода', status: 'pending' },
      { id: 's4', label: 'Запустить Run и mission checks', status: 'pending' },
      { id: 's5', label: 'Сделать Commit/Snapshot', status: 'pending' },
    ],
  },
  {
    id: 'plan-security',
    title: 'Security review перед деплоем',
    steps: [
      { id: 's1', label: 'Найти ввод пользователя', status: 'pending' },
      { id: 's2', label: 'Проверить innerHTML и localStorage', status: 'pending' },
      { id: 's3', label: 'Добавить негативный тест', status: 'pending' },
      { id: 's4', label: 'Проверить iframe sandbox', status: 'pending' },
      { id: 's5', label: 'Сформировать отчет для защиты', status: 'pending' },
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
  currentFileLabel?: string;
  missionTitle?: string;
  editorStatus?: string;
}

function buildCoachReply(params: {
  mode: CoachMode;
  model: ModelPreset;
  message: string;
  currentFileLabel?: string;
  missionTitle?: string;
  iframeError: string | null;
}): string {
  const scope = params.currentFileLabel ? `Фокус: ${params.currentFileLabel}.` : 'Фокус: текущий файл.';
  const mission = params.missionTitle ? `Миссия: ${params.missionTitle}.` : 'Миссия: текущая практика.';
  const error = params.iframeError ? `Вижу ошибку Preview: "${params.iframeError}".` : 'Preview сейчас без явной ошибки.';

  if (params.mode.id === 'builder') {
    return `${scope} ${mission} ${error}\n\nДействие: сформулируй один маленький diff, затем нажми Run. Если результат совпал с DoD, сделай Commit/Snapshot.`;
  }

  if (params.mode.id === 'reviewer') {
    return `${scope} ${mission}\n\nПроверка: сравни результат с DoD, проверь пустой ввод, повторный клик, ошибку в консоли и лишние изменения. Код меняй только после списка рисков.`;
  }

  if (params.mode.id === 'security') {
    return `${scope} ${error}\n\nSecurity-порядок: найди пользовательский ввод, проверь innerHTML, не вставляй секреты, не расширяй sandbox iframe. Безопасная правка должна быть маленькой и проверяемой.`;
  }

  return `${scope} ${mission}\n\nЗапрос понял: ${params.message}\n\nЯ бы шел так: 1) прочитать текущий шаг, 2) понять, какой файл менять, 3) сделать одну правку, 4) нажать Run, 5) зафиксировать результат commit/snapshot. Режим модели: ${params.model.label}.`;
}

export const AICoachPanel: React.FC<AICoachPanelProps> = ({
  iframeError,
  onClearError,
  showCheatSheet,
  onToggleCheatSheet,
  agentOpen,
  onToggleAgent,
  currentFileLabel,
  missionTitle,
  editorStatus = 'Working',
}) => {
  const [activeModeId, setActiveModeId] = useState<CoachModeId>('mentor');
  const [activeModelId, setActiveModelId] = useState<ModelPresetId>('balanced');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Я рядом как AI-наставник IDE. Выбери режим, задай вопрос или запусти Agent Plan.',
    },
  ]);
  const [activePlanId, setActivePlanId] = useState<string>(AGENT_PLANS[0].id);
  const [planSteps, setPlanSteps] = useState<AgentStep[]>(AGENT_PLANS[0].steps);
  const [agentRunning, setAgentRunning] = useState(false);
  const planTimerRef = useRef<number | null>(null);

  const activeMode = useMemo(
    () => COACH_MODES.find((mode) => mode.id === activeModeId) ?? COACH_MODES[0],
    [activeModeId],
  );
  const activeModel = useMemo(
    () => MODEL_PRESETS.find((model) => model.id === activeModelId) ?? MODEL_PRESETS[1],
    [activeModelId],
  );

  useEffect(() => {
    return () => {
      if (planTimerRef.current) window.clearTimeout(planTimerRef.current);
    };
  }, []);

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const now = Date.now();
    const assistantText = buildCoachReply({
      mode: activeMode,
      model: activeModel,
      message: trimmed,
      currentFileLabel,
      missionTitle,
      iframeError,
    });

    setMessages((prev) => [
      ...prev.slice(-5),
      { id: now, role: 'user', text: trimmed },
      { id: now + 1, role: 'assistant', text: assistantText },
    ]);
    setDraft('');
  };

  const handleSelectAgentPlan = (nextPlanId: string) => {
    const plan = AGENT_PLANS.find((p) => p.id === nextPlanId);
    setActivePlanId(nextPlanId);
    if (plan) setPlanSteps(plan.steps.map((s) => ({ ...s, status: 'pending' })));
    setAgentRunning(false);
    if (planTimerRef.current) window.clearTimeout(planTimerRef.current);
  };

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
        planTimerRef.current = window.setTimeout(advance, 650);
      } else {
        setAgentRunning(false);
        setPlanSteps((prev) => prev.map((s) => (s.status === 'active' ? { ...s, status: 'done' } : s)));
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

  return (
    <div className="ai-coach-panel ai-coach-dock">
      <div className="ai-dock-header">
        <div className="ai-dock-title">
          <Sparkles size={16} />
          <div>
            <strong>AI Copilot</strong>
            <span>{editorStatus} · {currentFileLabel ?? 'workspace'}</span>
          </div>
        </div>
        <button className="icon-btn" onClick={onToggleAgent} title="Agent Manager">
          <Bot size={15} />
        </button>
      </div>

      <div className="ai-model-row">
        <label>
          <Settings2 size={13} />
          Модель
          <select value={activeModelId} onChange={(e) => setActiveModelId(e.target.value as ModelPresetId)}>
            {MODEL_PRESETS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <small>{activeModel.desc}</small>
      </div>

      <div className="coach-mode-grid">
        {COACH_MODES.map((mode) => (
          <button
            key={mode.id}
            className={`coach-mode-btn ${activeModeId === mode.id ? 'active' : ''}`}
            onClick={() => setActiveModeId(mode.id)}
            title={mode.desc}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {iframeError && (
        <div className="error-analyzer-panel inline animate-fade-in">
          <div className="error-header">
            <div className="error-title">
              <MessageSquareWarning size={16} />
              <strong>Ошибка Preview</strong>
            </div>
            <button className="close-btn" onClick={onClearError} aria-label="Закрыть">
              <X size={14} />
            </button>
          </div>
          <div className="error-body">
            <p className="error-text"><code>{iframeError}</code></p>
            <button
              onClick={() => {
                setActiveModeId('mentor');
                setDraft(`Помоги исправить ошибку: "${iframeError}". Объясни шаг за шагом.`);
              }}
              className="copy-btn"
            >
              <MessageSquare size={14} /> Разобрать в чате
            </button>
          </div>
        </div>
      )}

      <div className="ai-next-steps">
        <div className="ai-section-title">Следующие шаги</div>
        {activeMode.steps.map((step, index) => (
          <div key={step} className="ai-step-row">
            <span>{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>

      <div className="ai-chat-thread">
        {messages.map((message) => (
          <div key={message.id} className={`ai-chat-message ${message.role}`}>
            <span>{message.role === 'assistant' ? 'AI' : 'Вы'}</span>
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <form className="ai-chat-form" onSubmit={handleSendMessage}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Спросите: что делать дальше, какой файл менять, как проверить diff..."
          rows={3}
        />
        <button className="btn btn-primary btn-sm" type="submit">
          <Send size={13} /> Спросить
        </button>
      </form>

      <div className="ai-dock-actions">
        <button className="btn btn-secondary btn-sm" onClick={onToggleCheatSheet}>
          <Copy size={13} /> Prompts
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onToggleAgent}>
          <Bot size={13} /> Agents
        </button>
      </div>

      {showCheatSheet && (
        <div className="cheat-sheet-panel inline animate-slide-in">
          <div className="cheat-sheet-header">
            <h5>Шаблоны промптов</h5>
            <button onClick={onToggleCheatSheet} className="close-btn" aria-label="Закрыть">
              <X size={14} />
            </button>
          </div>
          <div className="cheat-sheet-list">
            {CHEAT_SHEET_TEMPLATES.map((template) => (
              <div key={template.title} className="cheat-template">
                <div className="cheat-template-title">{template.title}</div>
                <div className="cheat-template-body">
                  <span className="tmpl-text">{template.text}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(template.text)}
                    className="copy-btn"
                    title="Скопировать"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {agentOpen && (
        <div className="agent-manager-panel inline animate-slide-in">
          <div className="agent-manager-header">
            <div className="agent-manager-title">
              <Bot size={16} />
              <strong>Agent Manager</strong>
            </div>
            <button onClick={onToggleAgent} className="close-btn" aria-label="Закрыть">
              <X size={16} />
            </button>
          </div>
          <div className="agent-manager-body">
            <label className="agent-plan-select-label">
              План агента
              <select
                value={activePlanId}
                onChange={(e) => handleSelectAgentPlan(e.target.value)}
                className="agent-plan-select"
              >
                {AGENT_PLANS.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title}
                  </option>
                ))}
              </select>
            </label>

            <ol className="agent-steps-list">
              {planSteps.map((step) => (
                <li key={step.id} className={`agent-step ${step.status}`}>
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
              <button onClick={handleStartAgentPlan} disabled={agentRunning} className="btn btn-primary btn-sm">
                {agentRunning ? 'Агент работает...' : 'Запустить план'}
              </button>
              <button onClick={handleResetAgentPlan} className="btn btn-secondary btn-sm">
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

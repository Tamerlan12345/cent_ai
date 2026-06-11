import React, { useState, useEffect, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { gradeSubmission } from '../lib/aiGateway';
import type { GradeResult } from '../lib/aiGateway';
import { runStaticChecks } from '../lib/grading';
import type { CheckResult, FunctionalTest, SandboxFiles } from '../lib/grading';
import { buildSandboxDoc, runFunctionalTests, useSandboxConsole } from '../lib/consoleBridge';
import {
  FileCode,
  Play,
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  History,
  Rocket,
  Cpu,
  HardDrive,
  CheckCircle2,
  Bot,
  BookOpen,
} from 'lucide-react';
import './CodeEditor.css';
import { AICoachPanel } from './AICoachPanel';
import {
  createDeployment,
  getQuotaForStudent,
  listDeploymentsForStudent,
} from '../lib/sandboxStore';
import type { MissionCheck, PracticeMission, SandboxStarter, UserProfile } from '../types';

interface Snapshot {
  id: number;
  timestamp: string;
  label?: string;
  html: string;
  css: string;
  js: string;
}

// Removed AgentStep and AGENT_PLANS and CHEAT_SHEET_TEMPLATES as they are moved to AICoachPanel

interface CodeEditorProps {
  weekId: number;
  weekTitle: string;
  dodCriteria: string[];
  onHomeworkApproved: () => void;
  userProfile?: UserProfile | null;
  initialFiles?: SandboxStarter;
  mission?: PracticeMission;
  onMissionCheckResults?: (results: CheckResult[]) => void;
  onMissionPassed?: () => void;
}

// Starter templates for Monaco Editor per week
const getStarterCodes = (weekId: number) => {
  switch (weekId) {
    case 3:
      return {
        html: `<div class="habit-app">\n  <h1>Мой Трекер Привычек</h1>\n  <form id="habit-form">\n    <input type="text" id="habit-input" placeholder="Какую привычку вырабатываем?" required />\n    <button type="submit">Добавить</button>\n  </form>\n  <div id="habits-list" class="habits-grid">\n    <!-- Привычки рендерятся здесь -->\n  </div>\n</div>`,
        css: `:root {\n  --bg: #0b0f19;\n  --panel: rgba(255, 255, 255, 0.03);\n  --border: rgba(255, 255, 255, 0.08);\n  --text: #f8fafc;\n  --accent: #00f2fe;\n}\n\n.habit-app {\n  max-width: 600px;\n  margin: 2rem auto;\n  background: var(--panel);\n  border: 1px solid var(--border);\n  padding: 2rem;\n  border-radius: 12px;\n  font-family: sans-serif;\n}\n\nform {\n  display: flex;\n  gap: 0.5rem;\n  margin-bottom: 1.5rem;\n}\n\ninput {\n  flex-grow: 1;\n  padding: 0.75rem;\n  background: #020617;\n  border: 1px solid var(--border);\n  color: var(--text);\n  border-radius: 8px;\n}\n\nbutton {\n  padding: 0.75rem 1.5rem;\n  background: var(--accent);\n  color: #000;\n  font-weight: bold;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.habits-grid {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}`,
        js: `// Моки (заглушки) для старта\nconst defaultHabits = [\n  { id: 1, name: "Пить 2 литра воды" },\n  { id: 2, name: "Читать 15 страниц книги" }\n];\n\n// Массив привычек: загрузка из LocalStorage или использование моков\nlet habits = JSON.parse(localStorage.getItem('habits')) || defaultHabits;\n\nconst listContainer = document.getElementById('habits-list');\nconst form = document.getElementById('habit-form');\nconst input = document.getElementById('habit-input');\n\nfunction renderHabits() {\n  listContainer.innerHTML = habits.map(h => \`\n    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">\n      <span>\${h.name}</span>\n      <button style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" onclick="deleteHabit(\${h.id})">Удалить</button>\n    </div>\n  \`).join('');\n}\n\n// Сделайте так, чтобы функция deleteHabit была доступна глобально\nwindow.deleteHabit = function(id) {\n  habits = habits.filter(h => h.id !== id);\n  localStorage.setItem('habits', JSON.stringify(habits));\n  renderHabits();\n};\n\nform.addEventListener('submit', (e) => {\n  e.preventDefault();\n  const name = input.value.trim();\n  if (name) {\n    const newHabit = {\n      id: Date.now(),\n      name: name\n    };\n    habits.push(newHabit);\n    localStorage.setItem('habits', JSON.stringify(habits));\n    renderHabits();\n    input.value = '';\n  }\n});\n\n// Начальный рендеринг\nrenderHabits();`,
      };
    case 4:
      return {
        html: `<div class="habit-app">\n  <h1>Отрефакторенный Трекер</h1>\n  <form id="habit-form">\n    <input type="text" id="habit-input" placeholder="Какую привычку вырабатываем?" required />\n    <button type="submit">Добавить</button>\n  </form>\n  <div id="habits-list" class="habits-grid">\n    <!-- Привычки рендерятся здесь -->\n  </div>\n</div>`,
        css: `:root {\n  --bg: #0b0f19;\n  --panel: rgba(255, 255, 255, 0.03);\n  --border: rgba(255, 255, 255, 0.08);\n  --text: #f8fafc;\n  --accent: #00f2fe;\n}\n\n.habit-app {\n  max-width: 600px;\n  margin: 2rem auto;\n  background: var(--panel);\n  border: 1px solid var(--border);\n  padding: 2rem;\n  border-radius: 12px;\n  font-family: sans-serif;\n}\n\nform {\n  display: flex;\n  gap: 0.5rem;\n  margin-bottom: 1.5rem;\n}\n\ninput {\n  flex-grow: 1;\n  padding: 0.75rem;\n  background: #020617;\n  border: 1px solid var(--border);\n  color: var(--text);\n  border-radius: 8px;\n}\n\nbutton {\n  padding: 0.75rem 1.5rem;\n  background: var(--accent);\n  color: #000;\n  font-weight: bold;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.habits-grid {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}`,
        js: `// Код с багами (без валидации спецсимволов XSS и без лимита на 50 символов)\nlet habits = JSON.parse(localStorage.getItem('habits')) || [];\n\nconst listContainer = document.getElementById('habits-list');\nconst form = document.getElementById('habit-form');\nconst input = document.getElementById('habit-input');\n\n// Устаревшие мертвые переменные, которые нужно удалить при рефакторинге:\nconst unusedToken = "123456789";\nconst oldCalculations = 42;\n\nfunction renderHabits() {\n  // Уязвимость XSS: имя вставляется напрямую в HTML без экранирования!\n  listContainer.innerHTML = habits.map(h => \`\n    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">\n      <span>\${h.name}</span>\n      <button style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" onclick="deleteHabit(\${h.id})">Удалить</button>\n    </div>\n  \`).join('');\n}\n\nwindow.deleteHabit = function(id) {\n  habits = habits.filter(h => h.id !== id);\n  localStorage.setItem('habits', JSON.stringify(habits));\n  renderHabits();\n};\n\nform.addEventListener('submit', (e) => {\n  e.preventDefault();\n  const name = input.value; // Нет проверки на максимальную длину 50 символов!\n  \n  const newHabit = {\n    id: Date.now(),\n    name: name\n  };\n  habits.push(newHabit);\n  localStorage.setItem('habits', JSON.stringify(habits));\n  renderHabits();\n  input.value = '';\n});\n\nrenderHabits();\n\n/*\n--- ТЕКСТ РЕЧИ ДЛЯ ЗАЩИТЫ ---\nНапишите текст вашей речи ниже в комментариях:\n1. Здравствуйте! Меня зовут ...\n2. Мой проект решает проблему ...\n3. Ссылка на деплой: ...\n*/`,
      };
    default:
      return {
        html: `<div class="sandbox-app">\n  <h2>Практическое задание: Неделя \${weekId}</h2>\n  <p>Редактируйте HTML, CSS и JS, чтобы увидеть изменения живьем.</p>\n  <div id="output-box"></div>\n</div>`,
        css: `.sandbox-app {\n  font-family: sans-serif;\n  padding: 1.5rem;\n  background: #182030;\n  color: #fff;\n  border-radius: 8px;\n}`,
        js: `document.getElementById('output-box').innerHTML = '<span style="color:#00F2FE">Песочница готова к проверке DoD.</span>';`,
      };
  }
};

const missionFiles = (html: string, css: string, js: string): SandboxFiles => ({ html, css, js });

function compilePattern(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'm');
  } catch {
    return null;
  }
}

function runMissionStaticChecks(files: SandboxFiles, checks: MissionCheck[]): CheckResult[] {
  const baseResults = runStaticChecks(files, {});
  const doc = new DOMParser().parseFromString(files.html, 'text/html');
  const missionResults: CheckResult[] = [];

  for (const check of checks) {
    if (check.kind === 'selector') {
      const selector = check.selector ?? '';
      const found = selector ? !!doc.querySelector(selector) : false;
      missionResults.push({
        id: check.id,
        label: check.label,
        passed: found,
        detail: found ? undefined : check.failHint,
      });
    }

    if (check.kind === 'js-pattern' || check.kind === 'css-pattern') {
      const pattern = check.pattern ? compilePattern(check.pattern) : null;
      const source = check.kind === 'js-pattern' ? files.js : files.css;
      const passed = pattern ? pattern.test(source) : false;
      missionResults.push({
        id: check.id,
        label: check.label,
        passed,
        detail: passed ? undefined : check.failHint,
      });
    }
  }

  return [...baseResults, ...missionResults];
}

function getMissionFunctionalTests(checks: MissionCheck[]): FunctionalTest[] {
  return checks
    .filter((check) => check.kind === 'functional')
    .map((check) => ({
      id: check.id,
      label: check.label,
      script: check.script ?? 'return false;',
    }));
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  weekId,
  weekTitle,
  dodCriteria,
  onHomeworkApproved,
  userProfile,
  initialFiles,
  mission,
  onMissionCheckResults,
  onMissionPassed,
}) => {
  const defaultCodes = initialFiles ?? getStarterCodes(weekId);
  const navigate = useNavigate();

  const [html, setHtml] = useState(defaultCodes.html);
  const [css, setCss] = useState(defaultCodes.css);
  const [js, setJs] = useState(defaultCodes.js);

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewResult, setReviewResult] = useState<GradeResult | null>(null);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [missionCheckResults, setMissionCheckResults] = useState<CheckResult[]>([]);
  const [checkingMission, setCheckingMission] = useState(false);

  const [agentOpen, setAgentOpen] = useState(false);

  // Internal deployment
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);
  const studentId = userProfile?.id ?? 'guest';
  const studentName = userProfile?.name ?? 'Гость';
  const quota = getQuotaForStudent(studentId, studentName);
  const [deployCount, setDeployCount] = useState<number>(
    () => listDeploymentsForStudent(studentId).length,
  );

  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeId = useMemo(
    () => `code-editor-${weekId}-${mission?.id ?? 'classic'}`,
    [weekId, mission?.id],
  );
  const sandboxConsole = useSandboxConsole(bridgeId);

  // Helper to generate iframe contents
  const getPreviewHtml = (h: string, c: string, j: string) => {
    return `
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }

      /* Custom Scrollbar for Iframe */
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #0A0E17; }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

            ${c}
          </style>
          <script>
            window.onerror = function(message, source, lineno, colno, error) {
              window.parent.postMessage({ type: 'IFRAME_ERROR', message: message }, '*');
              return false;
            };
            const originalConsoleError = console.error;
            console.error = function(...args) {
              window.parent.postMessage({ type: 'IFRAME_ERROR', message: args.join(' ') }, '*');
              originalConsoleError.apply(console, args);
            };
          </script>
        </head>
        <body>
          ${h}
          <script>
            try {
              ${j}
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              window.parent.postMessage({ type: 'IFRAME_ERROR', message: msg }, '*');
              document.body.innerHTML += '<div style="color:#EF4444; background:rgba(239,68,68,0.1); padding:1rem; border-radius:6px; margin-top:1rem; border:1px solid rgba(239,68,68,0.2)">Ошибка выполнения скрипта: ' + msg + '</div>';
            }
          </script>
        </body>
      </html>
    `;
  };

  const getPreviewDoc = (h: string, c: string, j: string) =>
    mission ? buildSandboxDoc(missionFiles(h, c, j), bridgeId) : getPreviewHtml(h, c, j);

  const [previewDoc, setPreviewDoc] = useState(() =>
    getPreviewDoc(defaultCodes.html, defaultCodes.css, defaultCodes.js),
  );

  // Compile on manual run button
  const handleRunCode = () => {
    setIframeError(null);
    sandboxConsole.clear();
    setPreviewDoc(getPreviewDoc(html, css, js));
  };

  const activeCode = activeTab === 'html' ? html : activeTab === 'css' ? css : js;
  const activeLanguage = activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript';
  const latestSandboxError = sandboxConsole.errors.length
    ? sandboxConsole.errors[sandboxConsole.errors.length - 1].text
    : null;

  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    setIframeError(null);
    setMissionCheckResults([]);
    if (activeTab === 'html') {
      setHtml(val);
      setPreviewDoc(getPreviewDoc(val, css, js));
    } else if (activeTab === 'css') {
      setCss(val);
      setPreviewDoc(getPreviewDoc(html, val, js));
    } else {
      setJs(val);
      setPreviewDoc(getPreviewDoc(html, css, val));
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'IFRAME_ERROR') {
        setIframeError(event.data.message as string);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mission && latestSandboxError) setIframeError(latestSandboxError);
  }, [mission, latestSandboxError]);

  // Timer and other effects removed since Agent Manager is moved

  const handleCreateSnapshot = (autoLabel?: string) => {
    const label =
      autoLabel ??
      window.prompt('Метка снапшота (например: «v1.0 — to defense»)', `step-${snapshots.length + 1}`) ??
      undefined;
    const newSnapshot: Snapshot = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      label: label || undefined,
      html,
      css,
      js,
    };
    setSnapshots([newSnapshot, ...snapshots]);
  };

  const handleRevertSnapshot = (snap: Snapshot) => {
    if (window.confirm(`Откатиться к версии ${snap.label ?? snap.timestamp}?`)) {
      setHtml(snap.html);
      setCss(snap.css);
      setJs(snap.js);
      setIframeError(null);
      setMissionCheckResults([]);
      sandboxConsole.clear();
      setPreviewDoc(getPreviewDoc(snap.html, snap.css, snap.js));
    }
  };

  const handleResetTemplate = () => {
    if (window.confirm('Сбросить код к исходному шаблону задания?')) {
      const codes = initialFiles ?? getStarterCodes(weekId);
      setHtml(codes.html);
      setCss(codes.css);
      setJs(codes.js);
      setIframeError(null);
      setMissionCheckResults([]);
      sandboxConsole.clear();
      setPreviewDoc(getPreviewDoc(codes.html, codes.css, codes.js));
    }
  };

  const runCurrentChecks = async () => {
    const files = missionFiles(html, css, js);
    const staticResults = mission
      ? runMissionStaticChecks(files, mission.checks)
      : runStaticChecks(files, {});
    const functionalTests = mission ? getMissionFunctionalTests(mission.checks) : [];
    let functionalResults: CheckResult[] = [];

    if (functionalTests.length > 0) {
      sandboxConsole.clear();
      setIframeError(null);
      setPreviewDoc(getPreviewDoc(html, css, js));
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      functionalResults = await runFunctionalTests(previewFrameRef.current, bridgeId, functionalTests);
    }

    return { staticResults, functionalResults };
  };

  const handleRunMissionChecks = async () => {
    if (!mission) return;

    setCheckingMission(true);
    try {
      const { staticResults, functionalResults } = await runCurrentChecks();
      const allResults = [...staticResults, ...functionalResults];
      const requiredIds = new Set(mission.checks.filter((check) => check.required).map((check) => check.id));
      const blockingResults = allResults.filter(
        (result) =>
          result.id === 'html-parses' ||
          result.id === 'js-parses' ||
          requiredIds.has(result.id),
      );
      const passed = blockingResults.length > 0 && blockingResults.every((result) => result.passed);

      setMissionCheckResults(allResults);
      onMissionCheckResults?.(allResults);
      if (passed) onMissionPassed?.();
    } finally {
      setCheckingMission(false);
    }
  };

  const handleSendHomework = async () => {
    setLoadingReview(true);
    setReviewResult(null);

    try {
      const { staticResults, functionalResults } = await runCurrentChecks();
      const allResults = [...staticResults, ...functionalResults];
      if (mission) {
        setMissionCheckResults(allResults);
        onMissionCheckResults?.(allResults);
      }
      const data = await gradeSubmission({
        kind: 'code',
        weekId,
        weekTitle,
        rubric: dodCriteria,
        payload: { html, css, js },
        staticResults,
        functionalResults,
      });

      setReviewResult(data);
      if (data.score >= 80) onHomeworkApproved();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'AI-шлюз недоступен';
      alert(`Ошибка проверки ИИ: ${errMsg}`);
    } finally {
      setLoadingReview(false);
    }
  };

  // Removed handleStartAgentPlan and handleResetAgentPlan

  const handleInternalDeploy = () => {
    setDeployFeedback(null);
    const projectName =
      window.prompt('Название релиза (попадёт в /preview/:id)', `MVP неделя ${weekId}`) ??
      `MVP неделя ${weekId}`;
    const result = createDeployment(
      { studentId, projectName, html, css, js, weekId },
      quota,
    );
    if (!result.ok) {
      setDeployFeedback(
        `Лимит внутренних деплоев исчерпан (${result.current ?? 0}/${result.max ?? 0}). ` +
          'Удалите старый деплой в кабинете куратора или попросите расширить квоту.',
      );
      return;
    }
    setDeployCount((c) => c + 1);
    setDeployFeedback(
      `Готово. Ссылка: /preview/${result.deployment!.id}. Открываю в новой вкладке.`,
    );
    window.setTimeout(() => navigate(`/preview/${result.deployment!.id}`), 600);
  };

  return (
    <div className="ide-sandbox-wrapper">
      {/* System Limits Banner — без Docker, ресурсы раздаём административно */}
      <div className="sandbox-limits-banner">
        <div className="limits-title">
          <Cpu size={14} />
          <span>Системные ограничения песочницы курса</span>
        </div>
        <div className="limits-pills">
          <div className="limit-pill" title="Оперативная память для превью">
            <HardDrive size={12} />
            RAM {quota.ramMb} МБ
          </div>
          <div className="limit-pill" title="Доля CPU, выделенная этой сессии">
            <Cpu size={12} />
            CPU {quota.cpuPercent}%
          </div>
          <div className="limit-pill" title="Сколько /preview/:id можно держать одновременно">
            <Rocket size={12} />
            Деплои {deployCount}/{quota.maxDeploys}
          </div>
          <div className="limit-pill" title="Максимум активного времени превью">
            ⏱ {Math.round(quota.maxRunSeconds / 60)} мин
          </div>
        </div>
      </div>

      {mission && (
        <div className="mission-check-panel glass-panel">
          <div className="mission-check-header">
            <div>
              <span className="mission-check-eyebrow">Mission checks</span>
              <h4>{mission.title}</h4>
            </div>
            <button
              onClick={handleRunMissionChecks}
              disabled={checkingMission}
              className="btn btn-primary btn-sm"
            >
              {checkingMission ? 'Проверяю...' : 'Проверить миссию'}
            </button>
          </div>

          {missionCheckResults.length > 0 ? (
            <div className="mission-check-grid">
              {missionCheckResults.map((result) => (
                <div
                  key={result.id}
                  className={`mission-check-row ${result.passed ? 'passed' : 'failed'}`}
                >
                  {result.passed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <div>
                    <span>{result.label}</span>
                    {result.detail && <small>{result.detail}</small>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mission-check-empty">
              Запустите проверку после правки кода. Сначала идут быстрые проверки файлов, затем сценарий в Live Preview.
            </p>
          )}
        </div>
      )}

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
              <button
                onClick={() => setAgentOpen(!agentOpen)}
                className={`btn btn-sm ${agentOpen ? 'btn-primary' : 'btn-secondary'}`}
                title="Симулятор Antigravity Agent Manager"
              >
                <Bot size={12} /> Agent
              </button>
              <div
                className="snapshot-controls"
                style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginRight: '0.5rem' }}
              >
                <button
                  onClick={() => handleCreateSnapshot()}
                  className="btn btn-secondary btn-sm"
                  title="Снапшот (Commit)"
                >
                  <History size={12} /> Снапшот
                </button>
                {snapshots.length > 0 && (
                  <select
                    className="snapshot-dropdown"
                    onChange={(e) => {
                      if (e.target.value) {
                        const snap = snapshots.find((s) => s.id === Number(e.target.value));
                        if (snap) handleRevertSnapshot(snap);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Откат...</option>
                    {snapshots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label ?? s.timestamp}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                onClick={() => setShowCheatSheet(!showCheatSheet)}
                className={`btn btn-sm ${showCheatSheet ? 'btn-primary' : 'btn-secondary'}`}
                title="Шпаргалка промптов"
              >
                <BookOpen size={12} />
              </button>
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

            <AICoachPanel
              iframeError={iframeError}
              onClearError={() => setIframeError(null)}
              showCheatSheet={showCheatSheet}
              onToggleCheatSheet={() => setShowCheatSheet(!showCheatSheet)}
              agentOpen={agentOpen}
              onToggleAgent={() => setAgentOpen(!agentOpen)}
            />
          </div>
        </div>

        {/* Live Preview Iframe */}
        <div className="preview-side glass-panel">
          <div className="preview-header">
            <span className="live-badge animate-pulse">LIVE PREVIEW</span>
            <span className="preview-label">Секция вывода (Iframe)</span>
          </div>
          <div className="iframe-wrapper">
            <iframe
              ref={previewFrameRef}
              srcDoc={previewDoc}
              title="Live Code Preview"
              sandbox="allow-scripts"
              className="preview-iframe"
            />
          </div>
        </div>
      </div>

      {/* Deploy + Homework Action Panel */}
      <div className="homework-action-bar glass-panel glow-border-cyan">
        <div className="action-text">
          <h4>Готовы сдать ДЗ или показать работу?</h4>
          <p>
            «Опубликовать в песочнице» — внутренний деплой /preview/:id, заменяет внешний хостинг во время курса.
            «Проверить ДЗ» — ИИ оценит код по критериям DoD (нужно ≥ 80%).
          </p>
        </div>
        <div className="action-buttons-wrapper">
          {mission && (
            <button
              onClick={handleRunMissionChecks}
              disabled={checkingMission}
              className="btn btn-outline"
              title="Запустить автопроверки текущей миссии"
            >
              <CheckCircle2 size={16} /> {checkingMission ? 'Проверяю...' : 'Проверить миссию'}
            </button>
          )}
          <button onClick={handleInternalDeploy} className="btn btn-secondary" title="Сохранить и открыть /preview/:id">
            <Rocket size={16} /> Внутренний деплой
          </button>
          <button onClick={handleSendHomework} disabled={loadingReview} className="btn btn-primary btn-large">
            {loadingReview ? (
              <span className="pulse-text">Запрос к ИИ…</span>
            ) : (
              <>
                <Send size={16} /> Отправить на проверку
              </>
            )}
          </button>
        </div>
      </div>

      {deployFeedback && (
        <div className="deploy-feedback animate-fade-in" role="status">
          {deployFeedback}
        </div>
      )}

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
              <h5>Рекомендации ИИ:</h5>
              <ul>
                {reviewResult.comments.map((comment, index) => (
                  <li key={index}>{comment}</li>
                ))}
              </ul>
            </div>

            <div className="report-markdown-review">
              <h5>Подробное ревью кода:</h5>
              <div className="markdown-viewport">
                {reviewResult.review_text.split('\n').map((line, idx) => {
                  if (line.startsWith('###')) {
                    return (
                      <h4 key={idx} style={{ margin: '1rem 0 0.5rem 0', color: 'var(--text-primary)' }}>
                        {line.replace(/###/g, '').trim()}
                      </h4>
                    );
                  } else if (line.startsWith('-')) {
                    return (
                      <li key={idx} style={{ marginLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                        {line.substring(1).trim()}
                      </li>
                    );
                  }
                  return (
                    <p key={idx} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

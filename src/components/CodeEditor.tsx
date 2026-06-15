import React, { useState, useEffect, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { gradeSubmission, generateDiff } from '../lib/aiGateway';
import type { GradeResult } from '../lib/aiGateway';
import { runStaticChecks } from '../lib/grading';
import type { CheckResult, FunctionalTest, SandboxFiles } from '../lib/grading';
import { PASSING_SCORE } from '../lib/constants';
import {
  buildSandboxDoc,
  runFunctionalTests,
  SANDBOX_STORAGE_SHIM,
  useSandboxConsole,
  waitForSandboxReady,
} from '../lib/consoleBridge';
import {
  FileCode,
  FileText,
  FolderOpen,
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
  GitBranch,
  Terminal,
  ShieldCheck,
  Gauge,
  Route,
  MousePointerClick,
  Settings,
} from 'lucide-react';
import './CodeEditor.css';
import { AICoachPanel } from './AICoachPanel';
import { DiffAuditor } from './tour/DiffAuditor';
import {
  createDeployment,
  getQuotaForStudent,
  listDeploymentsForStudent,
} from '../lib/sandboxStore';
import { useUiStore } from '../lib/uiStore';
import type { MissionCheck, PracticeMission, SandboxStarter, UserProfile } from '../types';

interface Snapshot {
  id: number;
  timestamp: string;
  label?: string;
  html: string;
  css: string;
  js: string;
}

type EditableFileKey = 'html' | 'css' | 'js';
type ContextFileKey = 'agents' | 'brief' | 'tests';
type IdeFileKey = EditableFileKey | ContextFileKey;

interface IdeFileMeta {
  key: IdeFileKey;
  label: string;
  path: string;
  language: string;
  group: 'app' | 'context';
  accent: string;
}

const IDE_FILES: IdeFileMeta[] = [
  { key: 'html', label: 'index.html', path: 'app/index.html', language: 'html', group: 'app', accent: '#e34f26' },
  { key: 'css', label: 'styles.css', path: 'app/styles.css', language: 'css', group: 'app', accent: '#1572b6' },
  { key: 'js', label: 'main.js', path: 'app/main.js', language: 'javascript', group: 'app', accent: '#f7df1e' },
  { key: 'agents', label: 'AGENTS.md', path: 'context/AGENTS.md', language: 'markdown', group: 'context', accent: '#a78bfa' },
  { key: 'brief', label: 'PROJECT_BRIEF.md', path: 'context/PROJECT_BRIEF.md', language: 'markdown', group: 'context', accent: '#22c55e' },
  { key: 'tests', label: 'TEST_PLAN.md', path: 'context/TEST_PLAN.md', language: 'markdown', group: 'context', accent: '#f59e0b' },
];

function isEditableFile(key: IdeFileKey): key is EditableFileKey {
  return key === 'html' || key === 'css' || key === 'js';
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

function runMissionStaticChecks(
  files: SandboxFiles,
  checks: MissionCheck[],
  deployPublished = false,
): CheckResult[] {
  const baseResults = runStaticChecks(files, {});
  const doc = new DOMParser().parseFromString(files.html, 'text/html');
  const missionResults: CheckResult[] = [];

  for (const check of checks) {
    if (check.id === 'check-deploy-published') {
      missionResults.push({
        id: check.id,
        label: check.label,
        passed: deployPublished,
        detail: deployPublished ? undefined : check.failHint,
      });
      continue;
    }

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

  const [activeFile, setActiveFile] = useState<IdeFileKey>('html');
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewResult, setReviewResult] = useState<GradeResult | null>(null);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [missionCheckResults, setMissionCheckResults] = useState<CheckResult[]>([]);
  const [checkingMission, setCheckingMission] = useState(false);

  const [agentOpen, setAgentOpen] = useState(false);

  // Режим эксперта управляет показом продвинутой обвязки IDE (git, квоты, агент-план).
  const expertMode = useUiStore((state) => state.expertMode);
  const toggleExpertMode = useUiStore((state) => state.toggleExpertMode);

  // Опция «агент пишет код»: агент предлагает дифф, ученик жмёт Принять/Отклонить.
  const [agentProposal, setAgentProposal] = useState<{
    original: string;
    modified: string;
    explanation: string;
    fromLiveAi: boolean;
  } | null>(null);
  const [agentThinking, setAgentThinking] = useState(false);
  const [agentNote, setAgentNote] = useState<string | null>(null);
  const jsStep = mission?.steps.find((step) => step.target === 'js');

  // Internal deployment
  const [deployFeedback, setDeployFeedback] = useState<string | null>(null);
  const studentId = userProfile?.id ?? 'guest';
  const studentName = userProfile?.name ?? 'Гость';
  const quota = getQuotaForStudent(studentId, studentName);
  const [deployCount, setDeployCount] = useState<number>(
    () => listDeploymentsForStudent(studentId).length,
  );
  const [lastDeploymentId, setLastDeploymentId] = useState<string | null>(
    () => listDeploymentsForStudent(studentId).find((deployment) => deployment.weekId === weekId)?.id ?? null,
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
            ${SANDBOX_STORAGE_SHIM}

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

  const contextFiles = useMemo<Record<ContextFileKey, string>>(() => {
    const missionTitle = mission?.title ?? `Практика недели ${weekId}`;
    const successCriteria = (mission?.successCriteria ?? dodCriteria)
      .map((criterion) => `- ${criterion}`)
      .join('\n');
    const checks = mission?.checks.length
      ? mission.checks.map((check) => `- [ ] ${check.label}`).join('\n')
      : '- [ ] HTML открывается без ошибок\n- [ ] JavaScript выполняется без ошибок\n- [ ] Live Preview соответствует DoD';

    return {
      agents: [
        '# AGENTS.md',
        '',
        '## Роль AI-агента',
        'Ты работаешь как аккуратный pairing-инженер внутри учебной IDE.',
        '',
        '## Правила',
        '- Сначала объясняй план простыми словами.',
        '- Делай маленький diff и не меняй лишние файлы.',
        '- Перед правкой уточняй цель, контекст, ограничения и DoD.',
        '- После изменения запускай Preview и проверки.',
        '- Если застрял, предложи откат к последнему commit/snapshot.',
      ].join('\n'),
      brief: [
        '# PROJECT_BRIEF.md',
        '',
        `## Неделя`,
        `${weekId}: ${weekTitle}`,
        '',
        '## Текущее задание',
        missionTitle,
        '',
        '## Артефакт',
        mission?.artifact ?? 'Рабочий фрагмент проекта в Live Preview.',
        '',
        '## Definition of Done',
        successCriteria || '- Результат понятен, запускается и проходит проверку.',
      ].join('\n'),
      tests: [
        '# TEST_PLAN.md',
        '',
        '## Быстрые проверки',
        checks,
        '',
        '## Ручной сценарий',
        '1. Проверить Live Preview: он обновляется автоматически.',
        '2. Если состояние зависло, нажать Перезапуск.',
        '3. Исправить ошибки из Problems.',
        '4. Сделать Commit/Snapshot.',
        '5. Отправить работу на AI-review.',
      ].join('\n'),
    };
  }, [dodCriteria, mission, weekId, weekTitle]);

  // Compile on manual run button
  const handleRunCode = () => {
    setIframeError(null);
    sandboxConsole.clear();
    setPreviewDoc(getPreviewDoc(html, css, js));
  };

  const activeFileMeta = IDE_FILES.find((file) => file.key === activeFile) ?? IDE_FILES[0]!;
  const activeCode = isEditableFile(activeFile)
    ? activeFile === 'html'
      ? html
      : activeFile === 'css'
        ? css
        : js
    : contextFiles[activeFile];
  const activeLanguage = activeFileMeta.language;
  const latestSandboxError = sandboxConsole.errors.length
    ? sandboxConsole.errors[sandboxConsole.errors.length - 1].text
    : null;

  const handleEditorChange = (value: string | undefined) => {
    if (!isEditableFile(activeFile)) return;
    const val = value || '';
    setIframeError(null);
    setMissionCheckResults([]);
    onMissionCheckResults?.([]);
    setLastDeploymentId(null);
    if (activeFile === 'html') {
      setHtml(val);
      setPreviewDoc(getPreviewDoc(val, css, js));
    } else if (activeFile === 'css') {
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
      onMissionCheckResults?.([]);
      setLastDeploymentId(null);
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
      onMissionCheckResults?.([]);
      setLastDeploymentId(null);
      sandboxConsole.clear();
      setPreviewDoc(getPreviewDoc(codes.html, codes.css, codes.js));
    }
  };

  const runCurrentChecks = async () => {
    const files = missionFiles(html, css, js);
    const staticResults = mission
      ? runMissionStaticChecks(files, mission.checks, Boolean(lastDeploymentId))
      : runStaticChecks(files, {});
    const functionalTests = mission ? getMissionFunctionalTests(mission.checks) : [];
    let functionalResults: CheckResult[] = [];

    if (functionalTests.length > 0) {
      sandboxConsole.clear();
      setIframeError(null);
      const ready = waitForSandboxReady(bridgeId);
      setPreviewDoc(getPreviewDoc(html, css, js));
      await ready;
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
        const requiredIds = new Set(
          mission.checks.filter((check) => check.required).map((check) => check.id),
        );
        const blockingResults = allResults.filter(
          (result) =>
            result.id === 'html-parses' ||
            result.id === 'js-parses' ||
            requiredIds.has(result.id),
        );
        const missionChecksPassed =
          blockingResults.length > 0 && blockingResults.every((result) => result.passed);
        if (!missionChecksPassed) {
          alert('Сначала пройдите обязательные проверки задания. ИИ-ревью откроется после зеленых checks.');
          return;
        }
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
      if (data.score >= PASSING_SCORE) onHomeworkApproved();
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
    setLastDeploymentId(result.deployment!.id);
    setDeployFeedback(
      `Готово. Ссылка: /preview/${result.deployment!.id}. Открываю в новой вкладке.`,
    );
    window.setTimeout(() => navigate(`/preview/${result.deployment!.id}`), 600);
  };

  // «Пусть агент напишет»: пробуем живой ai-gateway, иначе заготовка шага (демо-режим).
  const handleAgentWrite = async () => {
    if (!mission || !jsStep) return;
    setAgentNote(null);
    setAgentThinking(true);
    try {
      const requiredIds = mission.checks
        .filter((check) => check.kind === 'selector' && check.selector)
        .map((check) => check.selector!);
      const live = await generateDiff({
        files: missionFiles(html, css, js),
        instruction: jsStep.instruction,
        requiredIds,
      });
      if (live?.js) {
        setAgentProposal({ original: js, modified: live.js, explanation: live.explanation, fromLiveAi: true });
      } else if (jsStep.agentPatch?.js) {
        setAgentProposal({
          original: js,
          modified: jsStep.agentPatch.js,
          explanation: jsStep.agentPatch.explanation,
          fromLiveAi: false,
        });
      } else {
        setAgentNote(
          'В демо-режиме у этого шага пока нет заготовки агента. Подключите ai-gateway для живой генерации — или напишите код сами.',
        );
      }
      if (activeFile !== 'js') setActiveFile('js');
    } finally {
      setAgentThinking(false);
    }
  };

  // Ученик принял дифф агента — применяем код к app.js и делаем снапшот для отката.
  const handleAgentApprove = () => {
    if (!agentProposal) return;
    setJs(agentProposal.modified);
    setIframeError(null);
    setMissionCheckResults([]);
    onMissionCheckResults?.([]);
    sandboxConsole.clear();
    setPreviewDoc(getPreviewDoc(html, css, agentProposal.modified));
    handleCreateSnapshot('после агента');
    setAgentProposal(null);
  };

  const passedChecks = missionCheckResults.filter((result) => result.passed).length;
  const failedChecks = missionCheckResults.length - passedChecks;
  const latestSnapshot = snapshots[0];
  const editorStatus = iframeError
    ? 'Нужен fix'
    : missionCheckResults.length > 0 && failedChecks === 0
      ? 'Checks OK'
      : 'Работаем';
  const currentMissionStep = mission?.steps[0];
  const missionFocusText = mission
    ? `${mission.title}: ${mission.intro}`
    : `Неделя ${weekId}: соберите рабочий фрагмент проекта и проверьте его по DoD.`;
  const artifactLabel = mission?.artifact ?? 'MVP-снапшот';

  const renderFileIcon = (file: IdeFileMeta) =>
    file.group === 'context' ? <FileText size={14} /> : <FileCode size={14} />;

  return (
    <div className="ide-sandbox-wrapper">
      {/* System Limits Banner — без Docker, ресурсы раздаём административно.
          Скрыт от новичков, виден только в режиме эксперта. */}
      {expertMode && (
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
      )}

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
              {checkingMission ? 'Проверяю...' : 'Проверить задание'}
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

      {expertMode && (
      <div className="ide-learning-cockpit glass-panel">
        <div className="ide-learning-main">
          <span className="ide-learning-eyebrow">
            <Route size={14} /> Учебная песочница
          </span>
          <h3>{missionFocusText}</h3>
          <p>
            Работайте маленькими шагами: прочитайте текущую задачу, измените один файл,
            нажмите Run, затем Check. Если всё зелёное — делайте Snapshot и отправляйте на ревью.
          </p>
        </div>
        <div className="ide-learning-steps" aria-label="Порядок работы в учебной песочнице">
          {[
            ['1', 'Шаг', currentMissionStep?.title ?? 'Выберите файл'],
            ['2', 'Run', 'Посмотрите Preview'],
            ['3', 'Check', `${passedChecks}/${missionCheckResults.length || mission?.checks.length || 0}`],
            ['4', 'Artifact', artifactLabel],
          ].map(([number, label, value]) => (
            <div key={label} className="ide-learning-step">
              <span>{number}</span>
              <div>
                <strong>{label}</strong>
                <small>{value}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Professional Web IDE workspace */}
      <div className="ide-shell glass-panel">
        <div className="ide-shell-topbar">
          <div className="ide-product-mark">
            <FolderOpen size={16} />
            <div>
              <strong>Centras Web IDE</strong>
              <span>учебная AI-среда</span>
            </div>
          </div>
          <div className="ide-topbar-status">
            <span className={`ide-status-dot ${iframeError ? 'error' : 'ok'}`} />
            <span>{editorStatus}</span>
            {expertMode && (
              <>
                <span className="ide-topbar-divider" />
                <GitBranch size={13} />
                <span>main</span>
              </>
            )}
            <span className="ide-topbar-divider" />
            <Gauge size={13} />
            <span>{missionCheckResults.length ? `${passedChecks}/${missionCheckResults.length} checks` : 'checks ready'}</span>
            <span className="ide-topbar-divider" />
            <button
              type="button"
              onClick={toggleExpertMode}
              className={`ide-expert-toggle ${expertMode ? 'active' : ''}`}
              title="Режим эксперта: показать продвинутые панели (git, квоты, агент-план)"
              aria-pressed={expertMode}
            >
              <Settings size={13} /> {expertMode ? 'Эксперт: вкл' : 'Эксперт'}
            </button>
          </div>
        </div>

      <div className="ide-workspace-split">
        <aside className="ide-explorer-panel">
          <section className="ide-explorer-section">
            <div className="ide-panel-heading">
              <FolderOpen size={14} />
              <span>Файлы</span>
            </div>

            {(['app', 'context'] as const).map((group) => (
              <div key={group} className="ide-file-group">
                <div className="ide-file-group-title">
                  {group === 'app' ? 'Код проекта' : 'Контекст для ИИ'}
                </div>
                {IDE_FILES.filter((file) => file.group === group).map((file) => (
                  <button
                    key={file.key}
                    onClick={() => setActiveFile(file.key)}
                    className={`ide-file-row ${activeFile === file.key ? 'active' : ''} ${!isEditableFile(file.key) ? 'readonly' : ''}`}
                    style={{ '--file-accent': file.accent } as React.CSSProperties}
                  >
                    {renderFileIcon(file)}
                    <span>{file.label}</span>
                    {!isEditableFile(file.key) && <small>read</small>}
                  </button>
                ))}
              </div>
            ))}
          </section>

          {expertMode && (
          <section className="ide-git-panel">
            <div className="ide-panel-heading">
              <GitBranch size={14} />
              <span>Git-граф</span>
            </div>
            <div className="git-graph-list">
              <div className="git-graph-row working">
                <span className="git-rail"><span className="git-dot" /></span>
                <div>
                  <strong>working tree</strong>
                  <span>{latestSnapshot ? `после ${latestSnapshot.label ?? latestSnapshot.timestamp}` : 'без commit пока'}</span>
                </div>
              </div>
              {snapshots.map((snap, index) => (
                <button
                  key={snap.id}
                  className={`git-graph-row ${index === 0 ? 'head' : ''}`}
                  onClick={() => handleRevertSnapshot(snap)}
                  title="Откатиться к этому snapshot"
                >
                  <span className="git-rail"><span className="git-dot" /></span>
                  <div>
                    <strong>{snap.label ?? `commit-${snap.id}`}</strong>
                    <span>{snap.timestamp}</span>
                  </div>
                </button>
              ))}
              {snapshots.length === 0 && (
                <p className="git-empty-state">Snapshot — это точка возврата. Сделайте первый, когда Preview заработает.</p>
              )}
            </div>
          </section>
          )}
        </aside>

        {/* Monaco Editor Panel */}
        <div className="editor-side ide-editor-panel">
          <div className="editor-tabs-header">
            <div className="tab-buttons">
              {IDE_FILES.filter((file) => isEditableFile(file.key)).map((file) => (
                <button
                  key={file.key}
                  onClick={() => setActiveFile(file.key)}
                  className={`tab-btn ${activeFile === file.key ? 'active' : ''}`}
                  style={{ '--tab-accent': file.accent } as React.CSSProperties}
                >
                  {renderFileIcon(file)} {file.label}
                </button>
              ))}
            </div>

            <div className="editor-controls">
              {mission && jsStep && (
                <button
                  onClick={handleAgentWrite}
                  disabled={agentThinking}
                  className="btn btn-primary btn-sm"
                  title="Агент напишет код для текущего шага — вы проверите дифф и решите: принять или отклонить"
                >
                  <Bot size={12} /> {agentThinking ? 'Агент пишет…' : 'Пусть агент напишет'}
                </button>
              )}
              {expertMode && (
              <button
                onClick={() => setAgentOpen(!agentOpen)}
                className={`btn btn-sm ${agentOpen ? 'btn-primary' : 'btn-secondary'}`}
                title="Симулятор Antigravity Agent Manager"
              >
                <Bot size={12} /> Agent
              </button>
              )}
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
              <button onClick={handleRunCode} className="btn btn-secondary btn-sm" title="Перезапустить Live Preview">
                <Play size={12} /> Перезапуск
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
                fontSize: 15,
                lineHeight: 23,
                fontFamily: 'Fira Code, monospace',
                lineNumbers: isEditableFile(activeFile) ? 'on' : 'off',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: !isEditableFile(activeFile),
                renderLineHighlight: 'all',
              }}
            />
          </div>
        </div>

        {/* Live Preview Iframe */}
        <div className="preview-side ide-preview-panel">
          <div className="preview-header">
            <span className="live-badge">
              <MousePointerClick size={12} /> LIVE PREVIEW
            </span>
            <span className="preview-label">Что увидит пользователь</span>
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
          <div className="ide-console-panel">
            <div className="ide-console-tabs">
              <span><Terminal size={13} /> Problems</span>
              <span><ShieldCheck size={13} /> Sandbox</span>
            </div>
            <div className="ide-console-body">
              {iframeError ? (
                <p className="console-line error">{iframeError}</p>
              ) : sandboxConsole.entries.length > 0 ? (
                sandboxConsole.entries.slice(-3).map((entry) => (
                  <p key={`${entry.ts}-${entry.text}`} className={`console-line ${entry.level}`}>
                    {entry.text}
                  </p>
                ))
              ) : (
                <p className="console-line muted">Ошибок нет. Preview обновляется автоматически; Перезапуск нужен для чистого запуска.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="ai-sidecar">
          <AICoachPanel
            iframeError={iframeError}
            onClearError={() => setIframeError(null)}
            showCheatSheet={showCheatSheet}
            onToggleCheatSheet={() => setShowCheatSheet(!showCheatSheet)}
            agentOpen={agentOpen}
            onToggleAgent={() => setAgentOpen(!agentOpen)}
            currentFileLabel={activeFileMeta.label}
            missionTitle={mission?.title ?? weekTitle}
            editorStatus={editorStatus}
          />
        </aside>
      </div>
      </div>

      {agentNote && (
        <div className="deploy-feedback animate-fade-in" role="status">
          {agentNote}
        </div>
      )}

      {agentProposal && (
        <DiffAuditor
          original={agentProposal.original}
          modified={agentProposal.modified}
          explanation={agentProposal.explanation}
          fromLiveAi={agentProposal.fromLiveAi}
          onApprove={handleAgentApprove}
          onReject={() => setAgentProposal(null)}
        />
      )}

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
              title="Запустить автопроверки текущего задания"
            >
              <CheckCircle2 size={16} /> {checkingMission ? 'Проверяю...' : 'Проверить задание'}
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
        <div className={`ai-review-report glass-panel animate-fade-in ${reviewResult.score >= PASSING_SCORE ? 'approved' : 'rejected'}`}>
          <div className="report-header">
            <div className="grade-badge">
              <span>{reviewResult.score} / 100</span>
              <span className="grade-label">Оценка ИИ</span>
            </div>
            <div className="report-status-text">
              {reviewResult.score >= PASSING_SCORE ? (
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

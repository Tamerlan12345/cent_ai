import React, { useState } from 'react';
import { Copy, Check, Play, RefreshCw, MessageSquareCode, CheckCircle, AlertCircle } from 'lucide-react';
import { gradeSubmission } from '../lib/aiGateway';
import type { GradeResult } from '../lib/aiGateway';
import type { CheckResult } from '../lib/grading';
import type { PracticeTask, PracticeMission } from '../types';
import './PromptBuilder.css';

interface PromptBuilderProps {
  practice: PracticeTask;
  mission?: PracticeMission;
  weekTitle: string;
  weekId: number;
  onHomeworkApproved: () => void;
  onMissionCheckResults?: (results: CheckResult[]) => void;
  onMissionPassed?: () => void;
}

export const PromptBuilder: React.FC<PromptBuilderProps> = ({
  practice,
  mission,
  weekTitle,
  weekId,
  onHomeworkApproved,
  onMissionCheckResults,
  onMissionPassed,
}) => {
  const [goal, setGoal] = useState(practice.initialPrompt?.goal || '');
  const [context, setContext] = useState(practice.initialPrompt?.context || '');
  const [constraints, setConstraints] = useState(practice.initialPrompt?.constraints || '');
  const [dod, setDod] = useState(practice.initialPrompt?.dod || '');

  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<GradeResult | null>(null);

  const combinedPrompt = `# ИНСТРУКЦИЯ ДЛЯ AI-АГЕНТА

## 1. Цель (Goal)
${goal || '[Не заполнено]'}

## 2. Контекст (Context)
${context || '[Не заполнено]'}

## 3. Ограничения (Constraints)
${constraints || '[Не заполнено]'}

## 4. Критерии приемки (Definition of Done)
${dod || '[Не заполнено]'}`;

  const markPromptDirty = () => {
    setSimulationResult(null);
    onMissionCheckResults?.([]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(combinedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setGoal(practice.initialPrompt?.goal || '');
    setContext(practice.initialPrompt?.context || '');
    setConstraints(practice.initialPrompt?.constraints || '');
    setDod(practice.initialPrompt?.dod || '');
    setSimulationResult(null);
    onMissionCheckResults?.([]);
  };

  const handleSimulate = async () => {
    if (!goal || !context || !constraints || !dod) {
      alert("Пожалуйста, заполните все разделы конструктора, чтобы AI-агент получил полноценный контекст!");
      return;
    }

    let missionResults: CheckResult[] = [];

    if (mission) {
      const results: CheckResult[] = [];
      for (const check of mission.checks) {
        let passed = false;
        let evidence = '';
        const text = combinedPrompt.toLowerCase();
        
        if (check.id === 'check-goal' && goal.length > 5) passed = true;
        else if (check.id === 'check-context' && context.length > 5) passed = true;
        else if (check.id === 'check-constraints' && constraints.length > 5) passed = true;
        else if (check.id === 'check-dod' && dod.length > 5) passed = true;
        else if (check.id === 'check-brief' && combinedPrompt.length > 20) passed = true;
        else if (check.id === 'check-media' && combinedPrompt.length > 20) passed = true;
        else if (check.id === 'check-brief-role' && (text.includes('менеджер') || text.includes('роль') || text.includes('продакт'))) passed = true;
        else if (check.id === 'check-brief-scenario') {
          passed = text.includes('сценарий') || text.includes('шаги');
          evidence = passed ? 'Сценарий описан' : 'Опишите главный сценарий использования';
        }
        else if (check.id === 'check-screen-map') {
          passed = text.includes('экран') || text.includes('кнопк');
          evidence = passed ? 'Упомянуты элементы интерфейса' : 'Опишите экраны или кнопки';
        }
        else if (check.id === 'check-agents-md') {
          passed = text.includes('агент') || text.includes('правила');
          evidence = passed ? 'Роль агента и правила описаны' : 'Укажите правила для агента';
        }
        else if (check.id === 'check-speech-prompt') {
          passed = (text.includes('5 слайдов') || text.includes('пять слайдов')) && text.includes('речь');
          evidence = passed ? 'Запрошены 5 слайдов и речь' : 'Укажите требование: 5 слайдов и текст речи';
        }
        else if (combinedPrompt.length > 10) passed = true;
        
        results.push({
          id: check.id,
          label: check.label,
          passed,
          detail: passed ? undefined : (evidence || check.failHint)
        });
      }
      missionResults = results;
      onMissionCheckResults?.(results);
      const allPassed = results.every(r => r.passed);
      if (allPassed) {
        onMissionPassed?.();
      } else {
        alert('Не все локальные проверки пройдены! Проверьте подсказки слева и обновите промпт.');
        return;
      }
    }

    setSimulating(true);
    setSimulationResult(null);

    try {
      const data = await gradeSubmission({
        kind: 'prompt',
        weekId,
        weekTitle,
        rubric: practice.checklist?.length ? practice.checklist : mission?.successCriteria ?? [],
        payload: { prompt: combinedPrompt },
        staticResults: missionResults,
        functionalResults: [],
      });

      setSimulationResult(data);
      if (data.score >= 80) onHomeworkApproved();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'AI-шлюз недоступен';
      alert(`Ошибка проверки промпта: ${errMsg}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="prompt-builder-wrapper">
      <div className="builder-grid">
        {/* Form Inputs */}
        <div className="builder-inputs-column glass-panel">
          <div className="column-header">
            <h3>1. Блочный Конструктор</h3>
            <button onClick={handleReset} className="btn btn-secondary btn-sm" title="Сбросить промпт к шаблону">
              <RefreshCw size={12} /> Сбросить
            </button>
          </div>

          <div className="input-group">
            <label htmlFor="prompt-goal">Цель (Goal) — Зачем создается код?</label>
            <textarea
              id="prompt-goal"
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                markPromptDirty();
              }}
              placeholder="Какую бизнес-задачу или фичу мы пишем?"
              rows={3}
            />
          </div>

          <div className="input-group">
            <label htmlFor="prompt-context">Контекст (Context) — Архитектурные условия</label>
            <textarea
              id="prompt-context"
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                markPromptDirty();
              }}
              placeholder="Какая структура, язык, окружение?"
              rows={3}
            />
          </div>

          <div className="input-group">
            <label htmlFor="prompt-constraints">Ограничения (Constraints) — Что запрещено?</label>
            <textarea
              id="prompt-constraints"
              value={constraints}
              onChange={(e) => {
                setConstraints(e.target.value);
                markPromptDirty();
              }}
              placeholder="Запрет на Tailwind, объем файлов, лимиты..."
              rows={3}
            />
          </div>

          <div className="input-group">
            <label htmlFor="prompt-dod">DoD (Definition of Done) — Условия сдачи</label>
            <textarea
              id="prompt-dod"
              value={dod}
              onChange={(e) => {
                setDod(e.target.value);
                markPromptDirty();
              }}
              placeholder="Как понять, что задача завершена полностью?"
              rows={3}
            />
          </div>

          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="btn btn-primary w-full launch-btn"
          >
            {simulating ? (
              <span>Анализ промпта моделью Gemini...</span>
            ) : (
              <>
                <Play size={16} /> Проверить промпт ИИ
              </>
            )}
          </button>
        </div>

        {/* Live Output Codeblock */}
        <div className="builder-preview-column glass-panel">
          <div className="column-header">
            <h3>2. Готовый Инженерный Запрос</h3>
            <button onClick={handleCopy} className="btn btn-secondary btn-sm copy-btn">
              {copied ? (
                <>
                  <Check size={12} className="success-color" /> Скопировано
                </>
              ) : (
                <>
                  <Copy size={12} /> Копировать
                </>
              )}
            </button>
          </div>

          <div className="preview-container">
            <pre className="preview-prompt-text">{combinedPrompt}</pre>
          </div>
        </div>
      </div>

      {/* Simulated Output Response */}
      {simulating && (
        <div className="simulation-loading glass-panel glow-border-cyan animate-pulse">
          <MessageSquareCode size={28} className="loading-icon" />
          <div>
            <h4>Идет анализ структуры промпта...</h4>
            <p>ИИ Gemini оценивает полноту контекста, наличие ограничений и измеримость Definition of Done.</p>
          </div>
        </div>
      )}

      {simulationResult && (
        <div className={`simulation-results-box glass-panel animate-fade-in ${simulationResult.score >= 80 ? 'approved' : 'rejected'}`}>
          <div className="results-header">
            <div className="grade-badge">
              <span>{simulationResult.score} / 100</span>
              <span className="grade-label">Оценка ИИ</span>
            </div>
            <div className="report-status-text">
              {simulationResult.score >= 80 ? (
                <div className="status-indicator success">
                  <CheckCircle size={18} />
                  <span>Промпт зачтен!</span>
                </div>
              ) : (
                <div className="status-indicator error">
                  <AlertCircle size={18} />
                  <span>Не зачтено. Доработайте структуру.</span>
                </div>
              )}
            </div>
          </div>

          <div className="results-body">
            <div className="feedback-comments">
              <h5>Рекомендации преподавателя:</h5>
              <ul>
                {simulationResult.comments.map((comment, index) => (
                  <li key={index}>{comment}</li>
                ))}
              </ul>
            </div>

            <div className="agent-code-output">
              <h5>Подробный разбор промпта:</h5>
              <div className="markdown-viewport">
                {simulationResult.review_text.split('\n').map((line, idx) => {
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

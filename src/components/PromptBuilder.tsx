import React, { useState } from 'react';
import { Copy, Check, Play, RefreshCw, Star, MessageSquareCode } from 'lucide-react';
import type { PracticeTask } from '../types';
import './PromptBuilder.css';

interface PromptBuilderProps {
  practice: PracticeTask;
  onSuccess: () => void;
}

export const PromptBuilder: React.FC<PromptBuilderProps> = ({ practice, onSuccess }) => {
  const [goal, setGoal] = useState(practice.initialPrompt.goal);
  const [context, setContext] = useState(practice.initialPrompt.context);
  const [constraints, setConstraints] = useState(practice.initialPrompt.constraints);
  const [dod, setDod] = useState(practice.initialPrompt.dod);

  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    score: number;
    comments: string[];
    agentResponse: string;
  } | null>(null);

  const combinedPrompt = `# ИНСТРУКЦИЯ ДЛЯ AI-АГЕНТА

## 1. Цель (Goal)
${goal || '[Не заполнено]'}

## 2. Контекст (Context)
${context || '[Не заполнено]'}

## 3. Ограничения (Constraints)
${constraints || '[Не заполнено]'}

## 4. Критерии приемки (Definition of Done)
${dod || '[Не заполнено]'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(combinedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setGoal(practice.initialPrompt.goal);
    setContext(practice.initialPrompt.context);
    setConstraints(practice.initialPrompt.constraints);
    setDod(practice.initialPrompt.dod);
    setSimulationResult(null);
  };

  const handleSimulate = () => {
    if (!goal || !context || !constraints || !dod) {
      alert("Пожалуйста, заполните все разделы конструктора, чтобы AI-агент получил полноценный контекст!");
      return;
    }

    setSimulating(true);
    setSimulationResult(null);

    // Simulate network lag / thinking
    setTimeout(() => {
      setSimulating(false);
      
      // Dynamic rating logic based on input length
      const totalLength = goal.length + context.length + constraints.length + dod.length;
      let calculatedScore = Math.min(65 + Math.floor(totalLength / 12), 99);
      
      // Specific checks
      const comments = [...practice.simulationFeedback.comments];
      if (constraints.toLowerCase().includes('vanilla css') || constraints.toLowerCase().includes('чистый css')) {
        calculatedScore = Math.min(calculatedScore + 5, 100);
      } else {
        calculatedScore -= 10;
        comments.push("Рекомендуется жестко прописать отказ от Tailwind CSS в Ограничениях для строгого соблюдения стека.");
      }

      if (dod.toLowerCase().includes('build') || dod.toLowerCase().includes('сборка')) {
        calculatedScore = Math.min(calculatedScore + 5, 100);
      } else {
        comments.push("Добавьте команду запуска тестов или сборки ('npm run build') в DoD, чтобы агент сам верифицировал код.");
      }

      setSimulationResult({
        score: Math.max(calculatedScore, 60),
        comments: comments,
        agentResponse: practice.simulationFeedback.agentResponse,
      });

      // Notify parent of successful validation
      onSuccess();
    }, 1500);
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
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Какую бизнес-задачу или фичу мы пишем?"
              rows={3}
            />
          </div>

          <div className="input-group">
            <label htmlFor="prompt-context">Контекст (Context) — Архитектурные условия</label>
            <textarea
              id="prompt-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Какая структура, язык, окружение?"
              rows={3}
            />
          </div>

          <div className="input-group">
            <label htmlFor="prompt-constraints">Ограничения (Constraints) — Что запрещено?</label>
            <textarea
              id="prompt-constraints"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Запрет на Tailwind, объем файлов, лимиты..."
              rows={3}
            />
          </div>

          <div className="input-group">
            <label htmlFor="prompt-dod">DoD (Definition of Done) — Условия сдачи</label>
            <textarea
              id="prompt-dod"
              value={dod}
              onChange={(e) => setDod(e.target.value)}
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
              <span>Анализ промпта моделью...</span>
            ) : (
              <>
                <Play size={16} /> Запустить симуляцию
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
            <h4>Идет симуляция разработки...</h4>
            <p>Виртуальный AI-агент парсит промпт, проверяет зависимости и генерирует код.</p>
          </div>
        </div>
      )}

      {simulationResult && (
        <div className="simulation-results-box glass-panel glow-border-purple animate-fade-in">
          <div className="results-header">
            <div className="score-widget">
              <Star className="star-icon" />
              <div>
                <span className="score-value">{simulationResult.score}/100</span>
                <span className="score-label">Оценка промпта</span>
              </div>
            </div>
            <h4>Результат Тестирования Симулятора</h4>
          </div>

          <div className="results-body">
            <div className="feedback-comments">
              <h5>Рекомендации по улучшению:</h5>
              <ul>
                {simulationResult.comments.map((comment, index) => (
                  <li key={index}>{comment}</li>
                ))}
              </ul>
            </div>

            <div className="agent-code-output">
              <h5>Код, сгенерированный AI-агентом:</h5>
              <div className="simulated-response-md">
                {simulationResult.agentResponse.split('\n').map((line, idx) => (
                  <p key={idx} style={{ fontFamily: line.startsWith('###') || !line.startsWith(' ') ? 'var(--font-sans)' : 'var(--font-mono)' }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

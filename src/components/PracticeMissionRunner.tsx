import React, { useMemo, useState } from 'react';
import { Bot, CheckCircle2, Circle, Clock, Lightbulb, LockOpen, Target } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { PromptBuilder } from './PromptBuilder';
import type { CheckResult } from '../lib/grading';
import type { PracticeTask, UserProfile } from '../types';
import './PracticeMissionRunner.css';

interface PracticeMissionRunnerProps {
  practice: PracticeTask;
  weekTitle: string;
  weekId: number;
  onHomeworkApproved: () => void;
  userProfile?: UserProfile | null;
}

export const PracticeMissionRunner: React.FC<PracticeMissionRunnerProps> = ({
  practice,
  weekTitle,
  weekId,
  onHomeworkApproved,
  userProfile,
}) => {
  const missions = practice.missions ?? [];
  const [activeMissionIndex, setActiveMissionIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(() => new Set());

  const mission = missions[activeMissionIndex] ?? missions[0];

  const passedIds = useMemo(
    () => new Set(checkResults.filter((result) => result.passed).map((result) => result.id)),
    [checkResults],
  );

  if (!mission) return null;

  const activeStep = mission.steps[activeStepIndex] ?? mission.steps[0];
  const requiredCheckIds = mission.checks
    .filter((check) => check.required)
    .map((check) => check.id);
  const currentStepPassed =
    activeStep.checkIds.length > 0 && activeStep.checkIds.every((id) => passedIds.has(id));
  const missionPassed =
    requiredCheckIds.length > 0 && requiredCheckIds.every((id) => passedIds.has(id));
  const effectiveCompletedMissionIds = new Set(completedMissionIds);
  if (missionPassed) effectiveCompletedMissionIds.add(mission.id);
  const activeMissionDone = effectiveCompletedMissionIds.has(mission.id);
  const allMissionsDone =
    missions.length > 0 && missions.every((item) => effectiveCompletedMissionIds.has(item.id));

  const handleResults = (results: CheckResult[]) => {
    setCheckResults(results);
    if (!results.length) {
      setCompletedMissionIds((current) => {
        if (!current.has(mission.id)) return current;
        const next = new Set(current);
        next.delete(mission.id);
        return next;
      });
      return;
    }
    const nextPassedIds = new Set(results.filter((result) => result.passed).map((result) => result.id));
    const requiredIds = mission.checks.filter((check) => check.required).map((check) => check.id);
    const allRequiredPassed =
      requiredIds.length > 0 && requiredIds.every((id) => nextPassedIds.has(id));
    if (allRequiredPassed) {
      setCompletedMissionIds((current) => {
        if (current.has(mission.id)) return current;
        const next = new Set(current);
        next.add(mission.id);
        return next;
      });
    } else {
      setCompletedMissionIds((current) => {
        if (!current.has(mission.id)) return current;
        const next = new Set(current);
        next.delete(mission.id);
        return next;
      });
    }
  };

  const handleNextStep = () => {
    setActiveStepIndex((index) => Math.min(index + 1, mission.steps.length - 1));
    setHintLevel(0);
  };

  const handleMissionPassed = () => {
    setCompletedMissionIds((current) => {
      if (current.has(mission.id)) return current;
      const next = new Set(current);
      next.add(mission.id);
      return next;
    });
  };

  const handleHomeworkApproved = () => {
    const next = new Set(effectiveCompletedMissionIds);
    next.add(mission.id);
    setCompletedMissionIds(next);
    if (missions.every((item) => next.has(item.id))) onHomeworkApproved();
  };

  const handleSelectMission = (index: number) => {
    if (index === activeMissionIndex) return;
    setActiveMissionIndex(index);
    setActiveStepIndex(0);
    setHintLevel(0);
    setCheckResults([]);
  };

  return (
    <div className="mission-runner-wrapper">
      <div className="mission-runner-header glass-panel">
        <div>
          <span className="mission-eyebrow">Практика внутри недели</span>
          <h3>{mission.title}</h3>
          <p>{mission.intro}</p>
        </div>
        <div className="mission-artifact">
          <Target size={18} />
          <span>{mission.artifact}</span>
        </div>
      </div>

      <div className="mission-plan-strip glass-panel">
        <div className="mission-plan-title">
          <span>Маршрут занятия</span>
          <strong>{missions.length} миссии</strong>
        </div>
        <div className="mission-plan-list">
          {missions.map((item, index) => {
            const done = effectiveCompletedMissionIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`mission-plan-item ${index === activeMissionIndex ? 'active' : ''} ${done ? 'done' : ''}`}
                onClick={() => handleSelectMission(index)}
              >
                <span className="mission-plan-index">
                  {done ? <CheckCircle2 size={15} /> : index + 1}
                </span>
                <span className="mission-plan-copy">
                  <strong>{item.title}</strong>
                  <small>
                    <Clock size={12} /> {item.durationMinutes} мин · {item.artifact}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mission-runner-grid">
        <aside className="mission-side-panel glass-panel">
          <div className="mission-stepper">
            {mission.steps.map((step, index) => {
              const done = step.checkIds.length > 0 && step.checkIds.every((id) => passedIds.has(id));
              return (
                <button
                  key={step.id}
                  className={`mission-step-button ${index === activeStepIndex ? 'active' : ''} ${done ? 'done' : ''}`}
                  onClick={() => {
                    setActiveStepIndex(index);
                    setHintLevel(0);
                  }}
                >
                  {done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>

          <div className="mission-current-step">
            <span className="mission-step-target">{activeStep.target}</span>
            <h4>{activeStep.title}</h4>
            <p>{activeStep.instruction}</p>

            {hintLevel > 0 && (
              <div className="mission-hints">
                {activeStep.hints.slice(0, hintLevel).map((hint, index) => (
                  <div key={hint} className="mission-hint">
                    <Lightbulb size={14} />
                    <span>
                      Подсказка {index + 1}: {hint}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mission-step-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setHintLevel((level) => Math.min(level + 1, activeStep.hints.length))}
                disabled={hintLevel >= activeStep.hints.length}
              >
                <Lightbulb size={13} /> Подсказка
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleNextStep}
                disabled={!currentStepPassed || activeStepIndex === mission.steps.length - 1}
              >
                Следующий шаг
              </button>
            </div>

            {!currentStepPassed && (
              <p className="mission-step-helper">
                Чтобы перейти дальше: выполните действие в IDE, нажмите Run, затем «Проверить миссию» и исправьте красные checks.
              </p>
            )}

            {currentStepPassed && <p className="mission-step-done">{activeStep.doneText}</p>}
          </div>

          <div className="mission-agents">
            <div className="mission-agents-title">
              <Bot size={15} />
              <span>Инструкции агентам со skills</span>
            </div>
            {mission.agentInstructions.map((agent) => (
              <div key={`${agent.agentName}-${agent.skillName}`} className="mission-agent-card">
                <strong>{agent.agentName}</strong>
                <span>{agent.skillName}</span>
                <p>{agent.instruction}</p>
              </div>
            ))}
          </div>

          {activeMissionDone && (
            <div className="mission-unlock">
              <LockOpen size={16} />
              <span>
                {allMissionsDone
                  ? 'Все миссии недели готовы. Отправьте один недельный артефакт на проверку.'
                  : `${mission.unlockText} Выберите следующую миссию в маршруте.`}
              </span>
            </div>
          )}
        </aside>

        <div className="mission-editor-panel">
          {mission.steps[0]?.target === 'prompt' ? (
            <PromptBuilder
              key={`${weekId}-${mission.id}`}
              practice={practice}
              mission={mission}
              weekTitle={weekTitle}
              weekId={weekId}
              onHomeworkApproved={handleHomeworkApproved}
              onMissionCheckResults={handleResults}
              onMissionPassed={handleMissionPassed}
            />
          ) : (
            <CodeEditor
              key={`${weekId}-${mission.id}`}
              weekId={weekId}
              weekTitle={weekTitle}
              dodCriteria={mission.successCriteria}
              initialFiles={mission.starterFiles}
              mission={mission}
              onMissionCheckResults={handleResults}
              onMissionPassed={handleMissionPassed}
              onHomeworkApproved={handleHomeworkApproved}
              userProfile={userProfile}
            />
          )}
        </div>
      </div>
    </div>
  );
};

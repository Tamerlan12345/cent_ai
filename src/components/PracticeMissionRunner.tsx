import React, { useMemo, useState } from 'react';
import { Bot, CheckCircle2, Circle, Lightbulb, LockOpen, Target } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
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
  const mission = practice.missions?.[0];
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [sandboxUnlocked, setSandboxUnlocked] = useState(false);

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

  const handleResults = (results: CheckResult[]) => {
    setCheckResults(results);
  };

  const handleNextStep = () => {
    setActiveStepIndex((index) => Math.min(index + 1, mission.steps.length - 1));
    setHintLevel(0);
  };

  return (
    <div className="mission-runner-wrapper">
      <div className="mission-runner-header glass-panel">
        <div>
          <span className="mission-eyebrow">Guided IDE mission</span>
          <h3>{mission.title}</h3>
          <p>{mission.intro}</p>
        </div>
        <div className="mission-artifact">
          <Target size={18} />
          <span>{mission.artifact}</span>
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

          {missionPassed && (
            <div className="mission-unlock">
              <LockOpen size={16} />
              <span>{sandboxUnlocked ? mission.unlockText : 'Миссия пройдена. Свободная песочница доступна после сдачи ДЗ.'}</span>
            </div>
          )}
        </aside>

        <div className="mission-editor-panel">
          <CodeEditor
            key={`${weekId}-${mission.id}`}
            weekId={weekId}
            weekTitle={weekTitle}
            dodCriteria={mission.successCriteria}
            initialFiles={mission.starterFiles}
            mission={mission}
            onMissionCheckResults={handleResults}
            onMissionPassed={() => setSandboxUnlocked(true)}
            onHomeworkApproved={onHomeworkApproved}
            userProfile={userProfile}
          />
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { CheckCircle2, Play, BookOpen, Clock, PackageCheck, Route } from 'lucide-react';
import type { CourseModule } from '../types';
import './ModuleTimeline.css';

// Обрезка текста по словам: режем по последнему пробелу до лимита,
// чтобы не разрывать слово посередине. Многоточие добавляем только если текст реально обрезан.
function truncateWords(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const slice = text.substring(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.substring(0, lastSpace) : slice;
  return `${cut}…`;
}

interface ModuleTimelineProps {
  modules: CourseModule[];
  completedWeeks: number[];
  onSelectWeek: (weekId: number, tab: string) => void;
  activeWeek?: number;
}

export const ModuleTimeline: React.FC<ModuleTimelineProps> = ({
  modules,
  completedWeeks,
  onSelectWeek,
  activeWeek,
}) => {
  return (
    <section id="timeline" className="timeline-section">
      <div className="timeline-header">
        <h2 className="timeline-section-title">4-недельный базовый курс</h2>
        <p className="timeline-section-subtitle">
          Пошаговый путь от хаотичных запросов к автоматизированному производственному циклу
        </p>
      </div>

      <div className="timeline-container">
        <div className="timeline-line"></div>

        {modules.map((module, index) => {
          const isCompleted = completedWeeks.includes(module.id);
          const isNext = completedWeeks.length + 1 === module.id || (completedWeeks.length === 0 && module.id === 1);
          const isLocked = activeWeek ? module.id > activeWeek : false;

          return (
            <div
              key={module.id}
              className={`timeline-item ${isCompleted ? 'completed' : ''} ${isNext ? 'next' : ''} ${isLocked ? 'locked' : ''}`}
            >
              <div className="timeline-node">
                {isCompleted ? (
                  <CheckCircle2 className="node-icon completed-icon" />
                ) : (
                  <span className="node-number">{index + 1}</span>
                )}
              </div>

              <div className="timeline-content-card glass-panel">
                <div className="card-top">
                  <span className="week-label">Неделя {module.id}</span>
                  <div className="card-badges">
                    <span className="badge badge-cyan">
                      <Clock size={11} className="inline-icon" /> {module.duration}
                    </span>
                    {isCompleted && <span className="status-badge status-done">Пройдено</span>}
                    {isNext && <span className="status-badge status-current">Текущий</span>}
                    {isLocked && <span className="status-badge status-locked">Откроется позже</span>}
                  </div>
                </div>

                <h3 className="module-title">{module.title.substring(module.title.indexOf(':') + 1).trim()}</h3>
                <p className="module-desc">{module.shortDescription}</p>

                <div className="module-concept">
                  <strong>Концепция:</strong> {truncateWords(module.concept, 120)}
                </div>

                <div className="module-artifact-strip">
                  <PackageCheck size={15} />
                  <div>
                    <span>Результат недели</span>
                    <strong>{truncateWords(module.practice.expectedOutput ?? module.practice.title, 132)}</strong>
                  </div>
                </div>

                {!!module.practice.missions?.length && (
                  <div className="module-mission-strip" aria-label={`Миссии недели ${module.id}`}>
                    <span className="module-mission-strip-label">
                      <Route size={13} /> Миссии
                    </span>
                    <div className="module-mission-chips">
                      {module.practice.missions.slice(0, 3).map((mission, missionIndex) => (
                        <span key={mission.id} className="module-mission-chip">
                          {missionIndex + 1}. {truncateWords(mission.artifact, 42)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card-actions">
                  <button
                    onClick={() => onSelectWeek(module.id, '/slides')}
                    className="btn btn-secondary"
                    disabled={isLocked}
                  >
                    <BookOpen size={14} /> Читать слайды
                  </button>
                  <button
                    onClick={() => onSelectWeek(module.id, '/practice')}
                    className="btn btn-primary"
                    disabled={isLocked}
                  >
                    <Play size={14} /> Открыть практику
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

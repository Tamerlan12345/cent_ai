import React from 'react';
import { CheckCircle2, Play, BookOpen, Clock } from 'lucide-react';
import type { CourseModule } from '../types';
import './ModuleTimeline.css';

interface ModuleTimelineProps {
  modules: CourseModule[];
  completedWeeks: number[];
  onSelectWeek: (weekId: number, tab: string) => void;
}

export const ModuleTimeline: React.FC<ModuleTimelineProps> = ({
  modules,
  completedWeeks,
  onSelectWeek,
}) => {
  return (
    <section id="timeline" className="timeline-section">
      <div className="timeline-header">
        <h2 className="timeline-section-title">8-Недельная Программа Лаборатории</h2>
        <p className="timeline-section-subtitle">
          Пошаговый путь от хаотичных запросов к автоматизированному производственному циклу
        </p>
      </div>

      <div className="timeline-container">
        <div className="timeline-line"></div>

        {modules.map((module, index) => {
          const isCompleted = completedWeeks.includes(module.id);
          const isNext = completedWeeks.length + 1 === module.id || (completedWeeks.length === 0 && module.id === 1);

          return (
            <div
              key={module.id}
              className={`timeline-item ${isCompleted ? 'completed' : ''} ${isNext ? 'next' : ''}`}
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
                  </div>
                </div>

                <h3 className="module-title">{module.title.substring(module.title.indexOf(':') + 1).trim()}</h3>
                <p className="module-desc">{module.shortDescription}</p>

                <div className="module-concept">
                  <strong>Концепция:</strong> {module.concept.substring(0, 120)}...
                </div>

                <div className="card-actions">
                  <button
                    onClick={() => onSelectWeek(module.id, '/slides')}
                    className="btn btn-secondary"
                  >
                    <BookOpen size={14} /> Читать слайды
                  </button>
                  <button
                    onClick={() => onSelectWeek(module.id, '/practice')}
                    className="btn btn-primary"
                  >
                    <Play size={14} /> Начать практику
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

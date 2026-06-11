import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle,
  Code, BookOpen, Lightbulb, Zap, ArrowRight
} from 'lucide-react';
import type { CourseModule } from '../types';
import './SlideDeck.css';

interface SlideDeckProps {
  modules: CourseModule[];
  selectedWeekId: number;
  setSelectedWeekId: (id: number) => void;
}

export const SlideDeck: React.FC<SlideDeckProps> = ({
  modules,
  selectedWeekId,
  setSelectedWeekId,
}) => {
  const navigate = useNavigate();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [animClass, setAnimClass] = useState('slide-enter-right');
  const dirRef = useRef<'next' | 'prev'>('next');

  const activeModule = modules.find((m) => m.id === selectedWeekId) || modules[0];
  const activeSlide = activeModule.slides[currentSlideIndex] || activeModule.slides[0];
  const progress = ((currentSlideIndex + 1) / activeModule.slides.length) * 100;

  const triggerAnim = (dir: 'next' | 'prev') => {
    dirRef.current = dir;
    setAnimClass(dir === 'next' ? 'slide-exit-left' : 'slide-exit-right');
    setTimeout(() => {
      setAnimClass(dir === 'next' ? 'slide-enter-right' : 'slide-enter-left');
    }, 180);
  };

  const handleNext = useCallback(() => {
    if (currentSlideIndex < activeModule.slides.length - 1) {
      triggerAnim('next');
      setTimeout(() => setCurrentSlideIndex((i) => i + 1), 180);
    }
  }, [currentSlideIndex, activeModule.slides.length]);

  const handlePrev = useCallback(() => {
    if (currentSlideIndex > 0) {
      triggerAnim('prev');
      setTimeout(() => setCurrentSlideIndex((i) => i - 1), 180);
    }
  }, [currentSlideIndex]);

  const handleDotClick = (idx: number) => {
    triggerAnim(idx > currentSlideIndex ? 'next' : 'prev');
    setTimeout(() => setCurrentSlideIndex(idx), 180);
  };

  const handleWeekChange = (weekId: number) => {
    setSelectedWeekId(weekId);
    setCurrentSlideIndex(0);
    setAnimClass('slide-enter-right');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrev]);

  return (
    <section className="slides-section">
      {/* Week Selector */}
      <div className="slides-week-selector scroll-x">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => handleWeekChange(m.id)}
            className={`week-tab-btn ${m.id === selectedWeekId ? 'active' : ''}`}
          >
            Неделя {m.id}
          </button>
        ))}
      </div>

      <div className="slide-deck-container glass-panel">
        {/* Progress Bar */}
        <div className="slide-progress-track">
          <div className="slide-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Slide Header */}
        <div className="slide-header">
          <div className="slide-meta">
            <span className="slide-module-title">{activeModule.title}</span>
            <span className="slide-counter">
              {currentSlideIndex + 1} / {activeModule.slides.length}
            </span>
          </div>
          <h2 className="slide-title">
            {activeSlide.emoji && <span className="slide-title-emoji">{activeSlide.emoji}</span>}
            {activeSlide.title}
          </h2>
        </div>

        {/* Slide Body with animation */}
        <div className={`slide-body ${animClass}`} key={`${selectedWeekId}-${currentSlideIndex}`}>


          {/* ── IMAGE SUPPORT ── */}
          {activeSlide.imageUrl && (
            <div className="slide-image-wrapper glass-panel glow-border-cyan">
              <img src={activeSlide.imageUrl} alt={activeSlide.imageCaption || activeSlide.title} className="slide-image" />
              {activeSlide.imageCaption && <span className="slide-image-caption">{activeSlide.imageCaption}</span>}
            </div>
          )}

          {/* ── TEXT ── */}
          {activeSlide.type === 'text' && (
            <div className="slide-content text-content">
              <p>{activeSlide.content}</p>
            </div>
          )}

          {/* ── COMPARE ── */}
          {activeSlide.type === 'compare' && (
            <div className="slide-content compare-content">
              <p className="compare-intro">{activeSlide.content}</p>
              <div className="compare-grid">
                <div className="compare-panel bad glass-panel">
                  <div className="compare-panel-header">
                    <AlertTriangle size={16} className="panel-icon bad" />
                    <span>❌ Плохой запрос</span>
                  </div>
                  <pre className="compare-prompt-text">{activeSlide.badPrompt}</pre>
                </div>
                <div className="compare-panel good glass-panel">
                  <div className="compare-panel-header">
                    <CheckCircle size={16} className="panel-icon good" />
                    <span>✅ Правильный запрос</span>
                  </div>
                  <pre className="compare-prompt-text">{activeSlide.goodPrompt}</pre>
                </div>
              </div>
            </div>
          )}

          {/* ── CODE ── */}
          {activeSlide.type === 'code' && (
            <div className="slide-content code-content-wrapper">
              <p className="compare-intro">{activeSlide.content}</p>
              {activeSlide.codeSnippet && (
                <div className="code-snippet-box">
                  <div className="code-box-header">
                    <Code size={14} />
                    <span>{activeSlide.codeLanguage || 'Пример кода'}</span>
                  </div>
                  <pre className="code-block"><code>{activeSlide.codeSnippet}</code></pre>
                </div>
              )}
            </div>
          )}

          {/* ── DIAGRAM ── */}
          {activeSlide.type === 'diagram' && (
            <div className="slide-content diagram-content">
              <p className="compare-intro">{activeSlide.content}</p>
              {activeSlide.diagramSteps && (
                <div className="diagram-flow">
                  {activeSlide.diagramSteps.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <div
                        className="diagram-step"
                        style={{ '--step-color': step.color || 'var(--accent-primary)' } as React.CSSProperties}
                      >
                        <div className="diagram-step-icon">{step.icon}</div>
                        <div className="diagram-step-body">
                          <strong>{step.label}</strong>
                          <span>{step.desc}</span>
                        </div>
                      </div>
                      {idx < (activeSlide.diagramSteps?.length ?? 0) - 1 && (
                        <div className="diagram-arrow">
                          <ArrowRight size={18} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CHECKLIST ── */}
          {activeSlide.type === 'checklist' && (
            <div className="slide-content checklist-content">
              <p className="compare-intro">{activeSlide.content}</p>
              {activeSlide.items && (
                <ul className="slide-checklist">
                  {activeSlide.items.map((item, idx) => (
                    <li key={idx} className="slide-checklist-item" style={{ animationDelay: `${idx * 80}ms` }}>
                      <CheckCircle size={16} className="check-icon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── TIPS ── */}
          {activeSlide.type === 'tips' && (
            <div className="slide-content tips-content">
              <p className="compare-intro">{activeSlide.content}</p>
              {activeSlide.tipsList && (
                <div className="tips-grid">
                  {activeSlide.tipsList.map((tip, idx) => (
                    <div key={idx} className="tip-card" style={{ animationDelay: `${idx * 80}ms` }}>
                      <Lightbulb size={16} className="tip-icon" />
                      <p>{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── KEYPOINTS ── */}
          {activeSlide.type === 'keypoints' && (
            <div className="slide-content keypoints-content">
              <p className="compare-intro">{activeSlide.content}</p>
              {activeSlide.keyPointsList && (
                <div className="keypoints-grid">
                  {activeSlide.keyPointsList.map((kp, idx) => (
                    <div key={idx} className="keypoint-card" style={{ animationDelay: `${idx * 80}ms` }}>
                      <div className="keypoint-emoji">{kp.emoji}</div>
                      <div className="keypoint-body">
                        <strong>{kp.title}</strong>
                        <span>{kp.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INTERACTIVE ── */}
          {activeSlide.type === 'interactive' && (
            <div className="slide-content interactive-content">
              <p>{activeSlide.content}</p>
              <div className="interactive-teaser glass-panel glow-border-cyan">
                <BookOpen size={36} className="teaser-icon" />
                <h3>Готовы применить знания?</h3>
                <p>Этот модуль содержит практику для закрепления материала.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="slide-footer">
          <button
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className="btn btn-secondary slide-nav-btn"
          >
            <ChevronLeft size={16} /> Назад
          </button>

          <div className="slide-dots">
            {activeModule.slides.map((_, idx) => (
              <span
                key={idx}
                onClick={() => handleDotClick(idx)}
                className={`slide-dot ${idx === currentSlideIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          {currentSlideIndex === activeModule.slides.length - 1 ? (
            <button
              onClick={() => navigate('/practice')}
              className="btn btn-primary slide-nav-btn"
            >
              Начать практику <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn btn-primary slide-nav-btn"
            >
              Далее <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      <p className="slide-keyboard-hint">
        <Zap size={12} /> Навигация: клавиши ← →
      </p>
    </section>
  );
};

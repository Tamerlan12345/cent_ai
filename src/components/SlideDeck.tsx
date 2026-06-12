import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle,
  BookOpen, Lightbulb, Zap, ArrowRight, Sparkles, X
} from 'lucide-react';
import type { CourseModule } from '../types';
import { CodeHighlight } from './CodeHighlight';
import { explainSlide } from '../lib/aiGateway';
import type { ExplainResult } from '../lib/aiGateway';
import './SlideDeck.css';

/** Печатающийся текст — эффект «ИИ объясняет вживую». */
const Typewriter: React.FC<{ text: string }> = ({ text }) => {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setShown(text.length);
      return;
    }
    const timer = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(timer);
          return n;
        }
        return n + 3;
      });
    }, 16);
    return () => clearInterval(timer);
  }, [text]);
  return <span>{text.slice(0, shown)}</span>;
};

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

  // ── ИИ-учитель ──
  const [aiResult, setAiResult] = useState<ExplainResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFocusLine, setAiFocusLine] = useState<number | null>(null);

  const activeModule = modules.find((m) => m.id === selectedWeekId) || modules[0];
  const activeSlide = activeModule.slides[currentSlideIndex] || activeModule.slides[0];
  const progress = ((currentSlideIndex + 1) / activeModule.slides.length) * 100;

  // Сброс ИИ-панели при смене слайда/недели
  useEffect(() => {
    setAiResult(null);
    setAiLoading(false);
    setAiFocusLine(null);
  }, [currentSlideIndex, selectedWeekId]);

  const askAi = async (focusLine?: { number: number; text: string }) => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiFocusLine(focusLine?.number ?? null);
    try {
      const res = await explainSlide({
        title: activeSlide.title,
        content: activeSlide.content,
        codeSnippet: activeSlide.codeSnippet,
        codeLanguage: activeSlide.codeLanguage,
        focusLine,
      });
      setAiResult(res);
    } catch {
      setAiResult({
        explanation: 'Не получилось связаться с ИИ-учителем. Попробуйте ещё раз чуть позже.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCodeLineClick = (line: number) => {
    const text = (activeSlide.codeSnippet || '').split('\n')[line - 1] ?? '';
    if (!text.trim()) return;
    void askAi({ number: line, text });
  };

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
                <>
                  <CodeHighlight
                    code={activeSlide.codeSnippet}
                    language={activeSlide.codeLanguage}
                    highlightLine={aiFocusLine}
                    onLineClick={handleCodeLineClick}
                  />
                  <p className="ai-line-hint">
                    <Sparkles size={12} /> Кликните по строке кода — ИИ объяснит, что она делает
                  </p>
                </>
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

        {/* ── ИИ-учитель ── */}
        <div className="ai-teacher-zone">
          {!aiResult && !aiLoading && (
            <button className="ai-explain-btn" onClick={() => void askAi()}>
              <Sparkles size={15} />
              Объясни проще
            </button>
          )}

          {aiLoading && (
            <div className="ai-teacher-panel loading glass-panel">
              <div className="ai-teacher-header">
                <Sparkles size={16} className="ai-icon-pulse" />
                <span>ИИ-учитель думает…</span>
              </div>
              <div className="ai-thinking-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          {aiResult && !aiLoading && (
            <div className="ai-teacher-panel glass-panel glow-border-purple">
              <div className="ai-teacher-header">
                <Sparkles size={16} />
                <span>{aiFocusLine ? `ИИ-учитель · строка ${aiFocusLine}` : 'ИИ-учитель'}</span>
                <button
                  className="ai-close-btn"
                  onClick={() => {
                    setAiResult(null);
                    setAiFocusLine(null);
                  }}
                  aria-label="Закрыть объяснение"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="ai-teacher-text">
                <Typewriter text={aiResult.explanation} />
              </p>
              {aiResult.analogy && <p className="ai-teacher-analogy">{aiResult.analogy}</p>}
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

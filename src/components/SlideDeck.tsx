import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Code, BookOpen } from 'lucide-react';
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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const activeModule = modules.find((m) => m.id === selectedWeekId) || modules[0];
  const activeSlide = activeModule.slides[currentSlideIndex] || activeModule.slides[0];

  const handleNext = () => {
    if (currentSlideIndex < activeModule.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleWeekChange = (weekId: number) => {
    setSelectedWeekId(weekId);
    setCurrentSlideIndex(0);
  };

  return (
    <section className="slides-section">
      {/* Week Selector tabs */}
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
        {/* Slide Header */}
        <div className="slide-header">
          <div className="slide-meta">
            <span className="slide-module-title">{activeModule.title}</span>
            <span className="slide-counter">
              Слайд {currentSlideIndex + 1} из {activeModule.slides.length}
            </span>
          </div>
          <h2 className="slide-title">{activeSlide.title}</h2>
        </div>

        {/* Slide Body */}
        <div className="slide-body animate-fade-in" key={`${selectedWeekId}-${currentSlideIndex}`}>
          {activeSlide.type === 'text' && (
            <div className="slide-content text-content">
              <p>{activeSlide.content}</p>
            </div>
          )}

          {activeSlide.type === 'compare' && (
            <div className="slide-content compare-content">
              <p className="compare-intro">{activeSlide.content}</p>
              
              <div className="compare-grid">
                <div className="compare-panel bad glass-panel">
                  <div className="compare-panel-header">
                    <AlertTriangle size={16} className="panel-icon bad" />
                    <span>Плохой запрос (Хаос)</span>
                  </div>
                  <pre className="compare-prompt-text">{activeSlide.badPrompt}</pre>
                </div>

                <div className="compare-panel good glass-panel">
                  <div className="compare-panel-header">
                    <CheckCircle size={16} className="panel-icon good" />
                    <span>Хороший запрос (Контроль)</span>
                  </div>
                  <pre className="compare-prompt-text">{activeSlide.goodPrompt}</pre>
                </div>
              </div>
            </div>
          )}

          {activeSlide.type === 'code' && (
            <div className="slide-content code-content-wrapper">
              <p className="compare-intro">{activeSlide.content}</p>
              {activeSlide.codeSnippet && (
                <div className="code-snippet-box">
                  <div className="code-box-header">
                    <Code size={14} />
                    <span>Код примера / Конструкция</span>
                  </div>
                  <pre className="code-block"><code>{activeSlide.codeSnippet}</code></pre>
                </div>
              )}
            </div>
          )}

          {activeSlide.type === 'interactive' && (
            <div className="slide-content interactive-content">
              <p>{activeSlide.content}</p>
              <div className="interactive-teaser glass-panel glow-border-cyan">
                <BookOpen size={36} className="teaser-icon" />
                <h3>Готовы применить знания?</h3>
                <p>Этот модуль содержит 20-минутную практику для закрепления материала.</p>
              </div>
            </div>
          )}
        </div>

        {/* Slide Footer / Navigation Controls */}
        <div className="slide-footer">
          <button
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className="btn btn-secondary slide-nav-btn"
          >
            <ChevronLeft size={16} /> Назад
          </button>

          {/* Dots */}
          <div className="slide-dots">
            {activeModule.slides.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`slide-dot ${idx === currentSlideIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlideIndex === activeModule.slides.length - 1}
            className="btn btn-primary slide-nav-btn"
          >
            Далее <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

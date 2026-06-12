import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle,
  BookOpen, Lightbulb, Zap, ArrowRight, Sparkles, X, Target, Copy, HelpCircle
} from 'lucide-react';
import type { CourseModule } from '../types';
import { CodeHighlight } from './CodeHighlight';
import { explainSlide } from '../lib/aiGateway';
import type { ExplainResult } from '../lib/aiGateway';
import './SlideDeck.css';

/** Печатающийся текст — эффект «ИИ объясняет вживую». */
const Typewriter: React.FC<{ text: string }> = ({ text }) => {
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(() => (reducedMotion() ? text.length : 0));
  useEffect(() => {
    if (reducedMotion()) return;
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

const getSlideAction = (weekId: number, slideType: CourseModule['slides'][number]['type']) => {
  const weekActions: Record<number, string> = {
    1: 'Свяжите идею с вашим будущим MVP: запишите одну боль пользователя и одну фразу, зачем проект нужен.',
    2: 'Переведите мысль в контекст для агента: что он должен знать до изменения файлов?',
    3: 'Найдите маленькое действие в интерфейсе: какая кнопка, форма или список должны заработать первыми?',
    4: 'Проверьте готовность к защите: что сломается, если показать проект прямо сейчас?',
  };

  if (slideType === 'compare') return 'Сравните плохой и хороший prompt, затем перепишите один свой запрос по сильной версии.';
  if (slideType === 'code') return 'Кликните по непонятной строке и попросите ИИ объяснить ее простыми словами.';
  if (slideType === 'checklist') return 'Отметьте 1 пункт, который уже готов, и 1 пункт, который надо закрыть в MVP-мастере.';
  if (slideType === 'diagram') return 'Назовите текущий шаг маршрута: идея, контекст, сборка, проверка или защита.';

  return weekActions[weekId] ?? 'Сформулируйте один следующий шаг для вашего MVP.';
};

interface SlidePractice {
  title: string;
  tool: string;
  prompt: string;
  placeholder: string;
  starter: string;
}

interface SlideQuickCheck {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const getSlidePractice = (
  weekId: number,
  slideId: string,
  slideTitle: string,
  slideType: CourseModule['slides'][number]['type'],
): SlidePractice => {
  if (slideId === '1-15') {
    return {
      title: 'Canvas за 3 строки',
      tool: 'Здесь → потом Gemini/GPT',
      prompt: 'Не заполняйте весь Canvas сразу. Зафиксируйте только пользователя, боль и главный сценарий.',
      placeholder: 'Пользователь: ...\nБоль: ...\nГлавный сценарий: ...',
      starter: '',
    };
  }

  if (slideType === 'compare') {
    return {
      title: 'Перепишите запрос',
      tool: 'ChatGPT / Gemini',
      prompt: 'Возьмите слабый запрос со слайда и перепишите его по формуле: роль, цель, контекст, ограничения, формат.',
      placeholder: 'Роль: ...\nЦель: ...\nКонтекст: ...\nОграничения: ...\nФормат ответа: ...',
      starter: '',
    };
  }

  if (slideType === 'code') {
    return {
      title: 'Проверьте шаблон на практике',
      tool: 'Gemini / GPT / Antigravity',
      prompt: 'Скопируйте только нужный фрагмент и попросите ИИ объяснить, что надо заполнить первым.',
      placeholder: 'Что я скопирую:\nЧто попрошу объяснить:\nКакой артефакт должен получиться:',
      starter: '',
    };
  }

  const weeklyPractice: Record<number, SlidePractice> = {
    1: {
      title: 'Черновик Gem/GPT-наставника',
      tool: 'Gemini Gems / GPTs',
      prompt: 'Соберите личного учебного помощника по формуле Persona / Task / Context / Format.',
      placeholder: 'Persona: ты мой наставник по MVP...\nTask: помогай задавать вопросы...\nContext: я новичок, делаю проект за 4 недели...\nFormat: отвечай коротко, с 3 шагами...',
      starter: '',
    },
    2: {
      title: 'Контекст для Antigravity',
      tool: 'Antigravity',
      prompt: 'Запишите, что агент должен знать до изменения файлов: цель, файлы, запреты и DoD.',
      placeholder: 'Цель изменения:\nКакие файлы можно трогать:\nЧто нельзя менять:\nDefinition of Done:',
      starter: '',
    },
    3: {
      title: 'Задача Builder-агенту',
      tool: 'Antigravity Manager',
      prompt: 'Сформулируйте одну маленькую задачу для Builder, чтобы получить первый рабочий сценарий MVP.',
      placeholder: 'Роль агента:\nОдин экран или функция:\nЧто проверить в Preview:\nКакой snapshot сделать:',
      starter: '',
    },
    4: {
      title: 'QA / Security Red Team',
      tool: 'Gemini / GPT / Antigravity',
      prompt: 'Опишите проверку, которую должен выполнить QA-бот перед защитой. Он проверяет, но не меняет код.',
      placeholder: 'Роль бота:\nЧто проверить:\nКакие негативные сценарии:\nФормат отчета:',
      starter: '',
    },
  };

  return {
    ...weeklyPractice[weekId],
    title: `${weeklyPractice[weekId]?.title ?? 'Мини-практика'} · ${slideTitle}`,
  };
};

const getSlideQuickCheck = (
  weekId: number,
  slideType: CourseModule['slides'][number]['type'],
): SlideQuickCheck => {
  if (slideType === 'compare') {
    return {
      question: 'Какой запрос лучше для AI-агента?',
      options: ['Сделай красиво и как-нибудь', 'Роль + цель + контекст + ограничения + DoD'],
      correctIndex: 1,
      explanation: 'Агенту нужны рамки. Без роли, контекста и DoD он угадывает и часто ломает проект.',
    };
  }

  if (slideType === 'code') {
    return {
      question: 'Что делать, если код на слайде непонятен?',
      options: ['Просить ИИ переписать всё сразу', 'Попросить объяснить 1 строку и проверить Preview'],
      correctIndex: 1,
      explanation: 'Новичку безопаснее разбирать код маленькими кусками и проверять результат после каждого шага.',
    };
  }

  const weeklyChecks: Record<number, SlideQuickCheck> = {
    1: {
      question: 'Что обязательно нужно в Gem/GPT-наставнике?',
      options: ['Только красивое имя', 'Persona, Task, Context, Format и тестовый preview'],
      correctIndex: 1,
      explanation: 'Gems и GPTs становятся полезными, когда у них есть роль, задача, контекст, формат и проверка на реальном вопросе.',
    },
    2: {
      question: 'Что дать Antigravity до первой правки?',
      options: ['Только “сделай MVP”', 'Brief, AGENTS.md, ограничения и DoD'],
      correctIndex: 1,
      explanation: 'Контекстные файлы уменьшают хаос: агент понимает проект, границы и критерии готовности.',
    },
    3: {
      question: 'Что строим первым в MVP?',
      options: ['Все функции сразу', 'Один главный пользовательский сценарий'],
      correctIndex: 1,
      explanation: 'Первый успех — это один рабочий сценарий, который можно показать и проверить.',
    },
    4: {
      question: 'Что нужно перед внутренним deploy?',
      options: ['Только красивый экран', 'QA, Security, негативные тесты и ссылка preview'],
      correctIndex: 1,
      explanation: 'Перед защитой важна не только красота, но и проверка ошибок, XSS, пустого ввода и восстановления.',
    },
  };

  return weeklyChecks[weekId] ?? weeklyChecks[1];
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
  const [slideDrafts, setSlideDrafts] = useState<Record<string, string>>({});
  const [completedSlideTasks, setCompletedSlideTasks] = useState<Record<string, boolean>>({});
  const [quickAnswers, setQuickAnswers] = useState<Record<string, number>>({});

  const activeModule = modules.find((m) => m.id === selectedWeekId) || modules[0];
  const activeSlide = activeModule.slides[currentSlideIndex] || activeModule.slides[0];
  const progress = ((currentSlideIndex + 1) / activeModule.slides.length) * 100;
  const slideAction = getSlideAction(selectedWeekId, activeSlide.type);
  const slidePractice = getSlidePractice(selectedWeekId, activeSlide.id, activeSlide.title, activeSlide.type);
  const quickCheck = getSlideQuickCheck(selectedWeekId, activeSlide.type);
  const slideKey = `${selectedWeekId}-${activeSlide.id}`;
  const slideDraft = slideDrafts[slideKey] ?? slidePractice.starter;
  const slideTaskDone = Boolean(completedSlideTasks[slideKey]);
  const selectedQuickAnswer = quickAnswers[slideKey];

  // Сброс ИИ-панели при смене слайда/недели
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    navigate(`/slides?week=${weekId}`, { replace: true });
    setCurrentSlideIndex(0);
    setAnimClass('slide-enter-right');
  };

  const handlePracticeDraftChange = (value: string) => {
    setSlideDrafts((current) => ({ ...current, [slideKey]: value }));
    setCompletedSlideTasks((current) => ({ ...current, [slideKey]: false }));
  };

  const handleCopySlidePractice = () => {
    const text = [
      `Слайд: ${activeSlide.title}`,
      `Инструмент: ${slidePractice.tool}`,
      `Задача: ${slidePractice.prompt}`,
      '',
      slideDraft || slidePractice.placeholder,
    ].join('\n');
    void navigator.clipboard.writeText(text);
  };

  const handleCompleteSlideTask = () => {
    setCompletedSlideTasks((current) => ({ ...current, [slideKey]: true }));
  };

  const goToPractice = () => navigate(`/practice?week=${selectedWeekId}`);

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

        <div className="slide-action-strip">
          <div className="slide-action-copy">
            <span>
              <Target size={14} /> Микро-действие
            </span>
            <p>{slideAction}</p>
          </div>
          <button type="button" className="slide-action-cta" onClick={goToPractice}>
            В MVP-мастер <ArrowRight size={14} />
          </button>
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

        <div className="slide-practice-lab">
          <div className={`slide-task-card ${slideTaskDone ? 'done' : ''}`}>
            <div className="slide-task-header">
              <div>
                <span className="slide-task-eyebrow">
                  <Target size={13} /> Практика 3 минуты
                </span>
                <h3>{slidePractice.title}</h3>
              </div>
              <span className="slide-tool-badge">{slidePractice.tool}</span>
            </div>
            <p>{slidePractice.prompt}</p>
            <textarea
              value={slideDraft}
              onChange={(event) => handlePracticeDraftChange(event.target.value)}
              placeholder={slidePractice.placeholder}
              rows={4}
            />
            <div className="slide-task-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopySlidePractice}>
                <Copy size={13} /> Скопировать
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleCompleteSlideTask}>
                <CheckCircle size={13} /> {slideTaskDone ? 'Сделано' : 'Отметить'}
              </button>
            </div>
          </div>

          <div className="slide-quick-check">
            <span className="slide-task-eyebrow">
              <HelpCircle size={13} /> Мини-проверка
            </span>
            <h3>{quickCheck.question}</h3>
            <div className="slide-quick-options">
              {quickCheck.options.map((option, index) => {
                const answered = selectedQuickAnswer !== undefined;
                const isSelected = selectedQuickAnswer === index;
                const isCorrect = quickCheck.correctIndex === index;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setQuickAnswers((current) => ({ ...current, [slideKey]: index }))}
                    className={`slide-quick-option ${isSelected ? 'selected' : ''} ${
                      answered && isCorrect ? 'correct' : ''
                    } ${answered && isSelected && !isCorrect ? 'wrong' : ''}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {selectedQuickAnswer !== undefined && (
              <p className="slide-quick-feedback">
                {selectedQuickAnswer === quickCheck.correctIndex ? 'Верно. ' : 'Почти. '}
                {quickCheck.explanation}
              </p>
            )}
          </div>
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
                <Typewriter key={aiResult.explanation} text={aiResult.explanation} />
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
              <button
                key={idx}
                type="button"
                onClick={() => handleDotClick(idx)}
                aria-label={`Открыть слайд ${idx + 1}`}
                className={`slide-dot ${idx === currentSlideIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          {currentSlideIndex === activeModule.slides.length - 1 ? (
            <button
              onClick={goToPractice}
              className="btn btn-primary slide-nav-btn"
            >
              Открыть MVP-мастер <ArrowRight size={16} />
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

import React, { useState } from 'react';
import { HelpCircle, Check, X, ArrowRight, Award } from 'lucide-react';
import type { QuizQuestion } from '../types';
import './Quiz.css';

interface QuizProps {
  questions: QuizQuestion[];
  weekId: number;
  onComplete: (weekId: number) => void;
}

export const Quiz: React.FC<QuizProps> = ({ questions, weekId, onComplete }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="quiz-empty glass-panel">
        <p>Для этой недели тест еще не добавлен. Продолжайте практиковаться!</p>
      </div>
    );
  }

  const activeQuestion = questions[currentQuestionIdx];

  const handleOptionSelect = (optionIdx: number) => {
    if (isAnswered) return;
    setSelectedOptionIdx(optionIdx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOptionIdx === null || isAnswered) return;
    
    setIsAnswered(true);
    if (selectedOptionIdx === activeQuestion.correctAnswerIndex) {
      setCorrectAnswersCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOptionIdx(null);
    setIsAnswered(false);

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      onComplete(weekId);
    }
  };

  if (quizFinished) {
    // Цвета конфетти: cyan / purple / green из палитры платформы
    const confettiColors = ['#00F2FE', '#9B5DE5', '#10B981'];
    return (
      <div className="quiz-finished-card glass-panel glow-border-cyan animate-fade-in">
        {/* Празднование: CSS-конфетти, чисто визуальный слой */}
        <div className="quiz-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 53) % 100}%`,
                backgroundColor: confettiColors[i % confettiColors.length],
                animationDelay: `${(i % 6) * 0.18}s`,
                animationDuration: `${1.8 + (i % 4) * 0.35}s`,
              }}
            />
          ))}
        </div>
        <Award className="finished-icon animate-bounce" size={48} />
        <h3 className="finished-title gradient-text">Тест Недели {weekId} Пройден!</h3>
        <p className="finished-score">
          Ваш результат: <strong>{correctAnswersCount}</strong> из <strong>{questions.length}</strong> правильных ответов.
        </p>
        <p className="finished-note">
          Неделя {weekId} добавлена в ваш общий прогресс обучения. Так держать!
        </p>
      </div>
    );
  }

  return (
    <div className="quiz-card glass-panel">
      {/* Quiz Header */}
      <div className="quiz-header">
        <div className="quiz-info">
          <HelpCircle className="quiz-header-icon" />
          <span>Проверка знаний</span>
        </div>
        <span className="quiz-counter">
          Вопрос {currentQuestionIdx + 1} из {questions.length}
        </span>
      </div>

      {/* Quiz Body */}
      <div className="quiz-body">
        <h3 className="quiz-question-text">{activeQuestion.question}</h3>

        <div className="quiz-options-list">
          {activeQuestion.options.map((option, idx) => {
            let optionStateClass = '';
            if (isAnswered) {
              if (idx === activeQuestion.correctAnswerIndex) {
                optionStateClass = 'correct';
              } else if (idx === selectedOptionIdx) {
                optionStateClass = 'incorrect';
              }
            } else if (idx === selectedOptionIdx) {
              optionStateClass = 'selected';
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isAnswered}
                className={`quiz-option-btn ${optionStateClass}`}
              >
                <span className="option-indicator">
                  {isAnswered && idx === activeQuestion.correctAnswerIndex && <Check size={12} />}
                  {isAnswered && idx === selectedOptionIdx && idx !== activeQuestion.correctAnswerIndex && <X size={12} />}
                  {!isAnswered && String.fromCharCode(65 + idx)}
                </span>
                <span className="option-text">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation display */}
        {isAnswered && (
          <div className="quiz-explanation-box animate-fade-in">
            <h5>
              {selectedOptionIdx === activeQuestion.correctAnswerIndex ? (
                <span className="success-color">Верно!</span>
              ) : (
                <span className="error-color">Неверно.</span>
              )}
            </h5>
            <p>{activeQuestion.explanation}</p>
          </div>
        )}
      </div>

      {/* Quiz Footer */}
      <div className="quiz-footer">
        {!isAnswered ? (
          <button
            onClick={handleConfirmAnswer}
            disabled={selectedOptionIdx === null}
            className="btn btn-primary w-full"
          >
            Подтвердить ответ
          </button>
        ) : (
          <button onClick={handleNext} className="btn btn-primary w-full">
            {currentQuestionIdx < questions.length - 1 ? (
              <>
                Следующий вопрос <ArrowRight size={16} />
              </>
            ) : (
              'Завершить тест'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

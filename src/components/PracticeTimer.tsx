import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, Volume2 } from 'lucide-react';
import './PracticeTimer.css';

interface PracticeTimerProps {
  durationMinutes: number;
}

export const PracticeTimer: React.FC<PracticeTimerProps> = ({ durationMinutes }) => {
  const initialSeconds = durationMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const playAlarmSound = React.useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

      // Play Beep Beep pattern
      oscillator.start();
      setTimeout(() => oscillator.stop(), 500);
    } catch (e) {
      console.warn("AudioContext block by browser auto-play policy", e);
    }
  }, []);

  const handleTimerComplete = React.useCallback(() => {
    setIsRunning(false);
    playAlarmSound();
  }, [playAlarmSound]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, handleTimerComplete]);

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((initialSeconds - timeLeft) / initialSeconds) * 100;
  const isUrgent = timeLeft < 180; // less than 3 minutes

  return (
    <div className={`practice-timer-card glass-panel ${isUrgent ? 'urgent' : ''} ${isRunning ? 'running' : ''}`}>
      <div className="timer-header">
        <h4 className="timer-title">Таймер Спринта Практики</h4>
        <div className="timer-badge">
          <ClockIcon className="timer-badge-icon" />
          <span>{durationMinutes} минут</span>
        </div>
      </div>

      <div className="timer-display-container">
        <div className="timer-digits">{formatTime(timeLeft)}</div>
        <div className="timer-dial-bg">
          <div
            className="timer-dial-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="timer-controls">
        <button
          onClick={handleToggle}
          className={`btn ${isRunning ? 'btn-secondary' : 'btn-primary'} timer-btn`}
        >
          {isRunning ? (
            <>
              <Pause size={16} /> Пауза
            </>
          ) : (
            <>
              <Play size={16} /> Начать отсчет
            </>
          )}
        </button>

        <button onClick={handleReset} className="btn btn-secondary timer-btn-icon" title="Сбросить таймер">
          <RotateCcw size={16} />
        </button>

        <button onClick={playAlarmSound} className="btn btn-secondary timer-btn-icon" title="Проверить сигнал">
          <Volume2 size={16} />
        </button>
      </div>

      {isUrgent && timeLeft > 0 && (
        <div className="timer-alert">
          <AlertCircle size={14} />
          <span>Осталось менее 3 минут! Пора заканчивать DoD.</span>
        </div>
      )}

      {timeLeft === 0 && (
        <div className="timer-alert success">
          <CheckCircleIcon className="success-icon" />
          <span>Время вышло! Проверьте результат по критериям Done.</span>
        </div>
      )}
    </div>
  );
};

// Internal mini icons
const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ width: '12px', height: '12px' }}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ width: '14px', height: '14px' }}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

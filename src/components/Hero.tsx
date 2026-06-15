import React from 'react';
import { ArrowRight, Code, Shield, Sparkles } from 'lucide-react';
import heroImage from '../assets/hero_visual.png';
import './Hero.css';

interface HeroProps {
  onStartTraining: () => void;
  onOpenTour: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartTraining, onOpenTour }) => {
  return (
    <section className="hero-section">
      {/* Декоративный слой: анимированный градиент + неоновые орбы (чистый CSS) */}
      <div className="hero-bg-gradient" aria-hidden="true"></div>
      <div className="hero-orb hero-orb-cyan" aria-hidden="true"></div>
      <div className="hero-orb hero-orb-purple" aria-hidden="true"></div>
      <div className="hero-orb hero-orb-mix" aria-hidden="true"></div>

      <div className="hero-grid">
        <div className="hero-content">
          <div className="hero-badge-container hero-stagger-1">
            <span className="badge badge-cyan">
              <Sparkles size={12} className="inline-icon" /> Методология v1.0
            </span>
            <span className="hero-badge-text">Практический курс для новичков</span>
          </div>

          <h1 className="hero-title hero-stagger-2">
            Управляй AI-агентами <br />
            <span className="hero-highlight gradient-text">Без Хаоса в Коде</span>
          </h1>

          <p className="hero-description hero-stagger-3">
            Освой <strong>вайбкодинг</strong> по шагам: от беспорядочного копирования кода — к осознанному управлению ИИ-агентами, с понятными целями, проверкой качества и безопасностью.
          </p>

          <div className="hero-cta-buttons hero-stagger-4">
            <button onClick={onStartTraining} className="btn btn-primary btn-lg hero-cta-pulse">
              Начать обучение <ArrowRight size={16} />
            </button>
            <a href="#timeline" className="btn btn-secondary btn-lg">
              Программа курса
            </a>
          </div>

          <button type="button" className="hero-tour-link hero-stagger-4" onClick={onOpenTour}>
            Демо-тур 10 минут: попробовать интерфейс без полного курса
          </button>

          <div className="hero-features-row hero-stagger-5">
            <div className="hero-feature-item">
              <div className="feature-icon-wrapper cyan">
                <Code size={18} />
              </div>
              <div className="feature-text">
                <h4>20-мин практики</h4>
                <p>Ежедневные короткие спринты</p>
              </div>
            </div>

            <div className="hero-feature-item">
              <div className="feature-icon-wrapper purple">
                <Shield size={18} />
              </div>
              <div className="feature-text">
                <h4>Контроль качества</h4>
                <p>Понятные критерии готовности</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual-container hero-stagger-3">
          <div className="hero-image-wrapper glass-panel glow-border-cyan">
            <img
              src={heroImage}
              alt="Centras CodeAI Engineering Lab"
              className="hero-main-image"
            />
            <div className="image-overlay-glow"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { ArrowRight, Code, Shield, Sparkles } from 'lucide-react';
import heroImage from '../assets/hero_visual.png';
import './Hero.css';

interface HeroProps {
  onStartTraining: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartTraining }) => {
  return (
    <section className="hero-section">
      <div className="hero-grid">
        <div className="hero-content">
          <div className="hero-badge-container">
            <span className="badge badge-cyan">
              <Sparkles size={12} className="inline-icon" /> Методология v1.0
            </span>
            <span className="hero-badge-text">Практический курс для новичков</span>
          </div>

          <h1 className="hero-title">
            Управляй AI-агентами <br />
            <span className="hero-highlight">Без Хаоса в Коде</span>
          </h1>

          <p className="hero-description">
            Освой **вайбкодинг** на профессиональном уровне. Переходи от беспорядочного копирования кода к осознанному проектированию, контролю качества (DoD), MCP-протоколам и автоматизации пайплайнов.
          </p>

          <div className="hero-cta-buttons">
            <button onClick={onStartTraining} className="btn btn-primary btn-lg">
              Начать обучение <ArrowRight size={16} />
            </button>
            <a href="#timeline" className="btn btn-secondary btn-lg">
              Программа курса
            </a>
          </div>

          <div className="hero-features-row">
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
                <p>Методология целей G1-G4</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual-container">
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

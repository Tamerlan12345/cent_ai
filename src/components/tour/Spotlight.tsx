// Spotlight вводного тура: затемняет экран четырьмя панелями вокруг целевого
// элемента (центр остаётся кликабельным), рисует свечение и тултип с
// инструкцией шага. Цель ищется по атрибуту data-tour-spot.

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SpotlightConfig {
  targetKey: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface SpotlightProps {
  config: SpotlightConfig | null;
  onDismiss: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export const Spotlight: React.FC<SpotlightProps> = ({ config, onDismiss }) => {
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    if (!config) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour-spot="${config.targetKey}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: Math.max(r.top - PADDING, 0),
      left: Math.max(r.left - PADDING, 0),
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    });
  }, [config]);

  useEffect(() => {
    measure();
    if (!config) return;

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    // Подстраховка от сдвигов макета (ленивые шрифты, монако и т.п.)
    const interval = setInterval(measure, 600);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      clearInterval(interval);
    };
  }, [config, measure]);

  if (!config || !rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipBelow = rect.top + rect.height + 180 < vh;

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(Math.max(rect.left, 16), vw - 376),
    ...(tooltipBelow
      ? { top: rect.top + rect.height + 14 }
      : { bottom: vh - rect.top + 14 }),
  };

  return createPortal(
    <div className="tour-spotlight-root" role="dialog" aria-label={config.title}>
      {/* Четыре затемняющие панели — центр остаётся кликабельным */}
      <div className="spot-shade" style={{ top: 0, left: 0, width: '100vw', height: rect.top }} />
      <div
        className="spot-shade"
        style={{ top: rect.top + rect.height, left: 0, width: '100vw', height: Math.max(vh - rect.top - rect.height, 0) }}
      />
      <div className="spot-shade" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
      <div
        className="spot-shade"
        style={{ top: rect.top, left: rect.left + rect.width, width: Math.max(vw - rect.left - rect.width, 0), height: rect.height }}
      />

      {/* Светящаяся рамка вокруг цели */}
      <div
        className="spot-ring"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />

      {/* Тултип шага */}
      <div className="spot-tooltip glass-panel" style={tooltipStyle}>
        <h4>{config.title}</h4>
        <p>{config.text}</p>
        <div className="spot-tooltip-actions">
          {config.actionLabel && config.onAction && (
            <button className="btn btn-primary btn-sm" onClick={config.onAction}>
              {config.actionLabel}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onDismiss}>
            Понятно
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

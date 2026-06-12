import { useEffect, useRef } from 'react';

/** Настройки хука scroll-reveal. */
export interface UseRevealOptions {
  /** Доля видимости элемента, при которой срабатывает появление (0..1). */
  threshold?: number;
  /**
   * Каскадная задержка (мс): применяется к прямым дочерним элементам
   * через transition-delay — карточки «выплывают» одна за другой.
   */
  staggerDelay?: number;
}

/**
 * Хук scroll-reveal: возвращает ref для элемента.
 * Когда элемент впервые появляется во viewport, добавляет ему
 * класс `reveal-visible` (CSS-переход описан в index.css)
 * и сразу отписывается — анимация срабатывает один раз.
 *
 * Использование:
 *   const ref = useReveal<HTMLDivElement>({ staggerDelay: 120 });
 *   <div ref={ref} className="reveal">...</div>
 */
export function useReveal<T extends HTMLElement>(options: UseRevealOptions = {}) {
  const { threshold = 0.15, staggerDelay = 0 } = options;
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const revealElement = (target: Element) => {
      // Каскад: дочерним элементам с классом .reveal даём нарастающую задержку
      if (staggerDelay > 0) {
        Array.from(target.children).forEach((child, index) => {
          if (child instanceof HTMLElement && child.classList.contains('reveal')) {
            child.style.transitionDelay = `${index * staggerDelay}ms`;
            child.classList.add('reveal-visible');
          }
        });
      }
      target.classList.add('reveal-visible');
    };

    // Старые браузеры без IntersectionObserver — показываем сразу
    if (typeof IntersectionObserver === 'undefined') {
      revealElement(element);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, staggerDelay]);

  return elementRef;
}

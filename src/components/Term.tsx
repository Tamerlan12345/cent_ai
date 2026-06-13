import React from 'react';
import { GLOSSARY } from '../lib/glossary';
import './Term.css';

interface TermProps {
  /** Ключ термина из глоссария (например 'dod', 'mvp', 'diff'). */
  id: string;
  /** Текст, который видит ученик. Если не задан — берётся полное название термина. */
  children?: React.ReactNode;
}

/**
 * Подсвечивает термин и показывает простое объяснение во всплывающей подсказке.
 * Если термина нет в глоссарии — просто рендерит содержимое без обёртки.
 */
export const Term: React.FC<TermProps> = ({ id, children }) => {
  const entry = GLOSSARY[id];
  if (!entry) return <>{children}</>;
  return (
    <span
      className="glossary-term"
      title={entry.short}
      tabIndex={0}
      role="note"
      aria-label={`${entry.term}: ${entry.short}`}
    >
      {children ?? entry.term}
    </span>
  );
};

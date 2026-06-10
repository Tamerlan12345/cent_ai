// Diff-Auditor: ИИ не перезаписывает файлы напрямую — каждое изменение
// проходит через визуальный аудит диффа (Monaco Diff Editor) и явное
// решение студента: Принять или Отклонить.

import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { GitCompareArrows, Check, X, Bot, Database } from 'lucide-react';

interface DiffAuditorProps {
  original: string;
  modified: string;
  explanation: string;
  fromLiveAi: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export const DiffAuditor: React.FC<DiffAuditorProps> = ({
  original,
  modified,
  explanation,
  fromLiveAi,
  onApprove,
  onReject,
}) => {
  return (
    <div className="diff-auditor glass-panel glow-border-purple" data-tour-spot="diff-auditor">
      <div className="diff-auditor-header">
        <div className="diff-auditor-title">
          <GitCompareArrows size={18} />
          <h4>Diff-Auditor — app.js</h4>
        </div>
        <span className={`diff-source-badge ${fromLiveAi ? 'live' : 'cached'}`}>
          {fromLiveAi ? <Bot size={12} /> : <Database size={12} />}
          {fromLiveAi ? 'Живой ИИ' : 'Кэш движка'}
        </span>
      </div>

      <p className="diff-auditor-explanation">{explanation}</p>

      <div className="diff-editor-container">
        <DiffEditor
          height="260px"
          language="javascript"
          theme="vs-dark"
          original={original}
          modified={modified}
          options={{
            readOnly: true,
            renderSideBySide: false,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="diff-auditor-actions">
        <button className="btn btn-primary" onClick={onApprove}>
          <Check size={16} /> Утвердить (Accept)
        </button>
        <button className="btn btn-secondary" onClick={onReject}>
          <X size={16} /> Отклонить
        </button>
      </div>
    </div>
  );
};

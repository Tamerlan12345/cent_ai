import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Rocket, AlertOctagon, Clock } from 'lucide-react';
import { getDeployment, getQuotaForStudent } from '../lib/sandboxStore';
import type { DeployedSnapshot } from '../types';
import './DeployPreview.css';

/**
 * Внутренний «деплой» курса.
 * Заменяет внешний хостинг во время обучения — ученик может показать
 * куратору ссылку /preview/:id, не настраивая Netlify/Vercel.
 *
 * Песочница: iframe sandbox="allow-scripts", без allow-same-origin —
 * скрипт не имеет доступа к localStorage платформы.
 */
export const DeployPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<DeployedSnapshot | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const dep = getDeployment(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeployment(dep);
    if (dep) {
      const q = getQuotaForStudent(dep.studentId);
      setTimeLeft(q.maxRunSeconds);
    }
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft(t => t !== null && t > 0 ? t - 1 : 0), 1000);
    return () => window.clearInterval(timer);
  }, [timeLeft]);

  const previewDoc = useMemo(() => {
    if (!deployment) return '';
    return `
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escape(deployment.projectName)}</title>
          <style>
            html, body { margin: 0; padding: 0; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }
            ${deployment.css}
          </style>
        </head>
        <body>
          ${deployment.html}
          <script>
            try {
              ${deployment.js}
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              document.body.innerHTML += '<div style="color:#EF4444; background:rgba(239,68,68,0.1); padding:1rem; border-radius:6px; margin:1rem; border:1px solid rgba(239,68,68,0.2)">Ошибка выполнения скрипта: ' + msg + '</div>';
            }
          </script>
        </body>
      </html>
    `;
  }, [deployment]);

  if (!id) {
    return (
      <div className="deploy-preview-empty">
        <AlertOctagon size={32} />
        <p>Неверный адрес: не указан id деплоя.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          <ArrowLeft size={16} /> На главную
        </button>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="deploy-preview-empty">
        <AlertOctagon size={32} />
        <h2>Деплой не найден</h2>
        <p>
          Внутренний деплой <code>/preview/{id}</code> уже удалён или ещё не создан.
          Если это ваш проект — проверьте кабинет «Мои деплои».
        </p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          <ArrowLeft size={16} /> На главную
        </button>
      </div>
    );
  }

  const created = new Date(deployment.createdAt).toLocaleString('ru-RU');

  return (
    <div className="deploy-preview-wrapper">
      <header className="deploy-preview-header glass-panel">
        <div className="deploy-preview-meta">
          <div className="deploy-preview-title">
            <Rocket size={18} />
            <strong>{deployment.projectName}</strong>
          </div>
          <div className="deploy-preview-sub">
            <span>
              <Clock size={12} /> {created}
            </span>
            {deployment.weekId && <span>Неделя {deployment.weekId}</span>}
            <span className="deploy-preview-id">id: {deployment.id}</span>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Назад
        </button>
      </header>

      <div className="deploy-preview-frame-shell">
        {timeLeft !== null && timeLeft <= 0 ? (
          <div className="deploy-preview-empty">
            <AlertOctagon size={32} />
            <h2>Лимит времени исчерпан</h2>
            <p>
              Выделенная квота времени выполнения ({getQuotaForStudent(deployment.studentId).maxRunSeconds} сек) истекла.
            </p>
          </div>
        ) : (
          <iframe
            title={deployment.projectName}
            srcDoc={previewDoc}
            sandbox="allow-scripts"
            className="deploy-preview-iframe"
          />
        )}
      </div>

      <footer className="deploy-preview-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>
          Внутренний деплой курса. Это не публичный хостинг — после курса вы
          перенесёте проект на GitHub Pages, Netlify или Vercel (см. библиотеку ресурсов).
        </span>
        {timeLeft !== null && timeLeft > 0 && (
          <span style={{ color: timeLeft < 60 ? '#ef4444' : 'inherit' }}>
            Осталось времени: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        )}
      </footer>
    </div>
  );
};

// безопасный escape для <title>
function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

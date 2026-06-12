import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, FileText, Calendar, Cpu, HardDrive, Rocket, Save, Trash2 } from 'lucide-react';
import {
  defaultQuotaTemplate,
  getQuotaForStudent,
  listDeploymentsForStudent,
  deleteDeployment,
  upsertQuota,
} from '../lib/sandboxStore';
import type { ResourceQuota, DeployedSnapshot } from '../types';
import { CodeHighlight } from './CodeHighlight';
import './TeacherDashboard.css';

interface StudentProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface SubmissionPayload {
  files?: { html?: string; css?: string; js?: string };
  criteria?: { index: number; passed: boolean; evidence: string; advice?: string }[];
  comments?: string[];
}

interface Submission {
  id: string;
  week_id: number;
  student_id: string;
  course_slug: string;
  score: number;
  status: 'approved' | 'rejected' | 'pending';
  payload: SubmissionPayload | null;
  review_text: string;
  created_at: string;
  student_profile?: StudentProfile;
}

export const TeacherDashboard: React.FC = () => {
  const [activeWeek, setActiveWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // Производные данные
  const [stuckStudents, setStuckStudents] = useState<{ profile: StudentProfile; count: number }[]>([]);
  const [quotaBlockedStudents, setQuotaBlockedStudents] = useState<StudentProfile[]>([]);

  // Управление ресурсами: квоты + список деплоев на выбранного ученика
  const [quotaStudentId, setQuotaStudentId] = useState<string>('');
  const [quotaDraft, setQuotaDraft] = useState<ResourceQuota | null>(null);
  const [studentDeployments, setStudentDeployments] = useState<DeployedSnapshot[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [cohortRes, profilesRes, subsRes, courseRes] = await Promise.all([
          supabase.from('cohorts').select('active_week').eq('id', 1).single(),
          supabase.from('profiles').select('id,email,name,role').eq('role', 'student'),
          supabase.from('submissions').select('*'),
          supabase.from('course_modules').select('id').order('position'),
        ]);

        if (cohortRes.data) setActiveWeek((cohortRes.data as { active_week: number }).active_week);
        const profileList = (profilesRes.data ?? []) as StudentProfile[];
        setStudents(profileList);

        const rawSubs = (subsRes.data ?? []) as Submission[];
        const mappedSubs = rawSubs.map((s) => ({
            ...s,
            student_profile: profileList.find((p) => p.id === s.student_id),
        }));
        setSubmissions(mappedSubs);

        // Анализ: Кто застрял (больше 5 неудачных попыток в активной неделе без успеха)
        const currentWeekSubs = mappedSubs.filter(s => s.week_id === (cohortRes.data as { active_week?: number })?.active_week);
        const stuckList: { profile: StudentProfile; count: number }[] = [];
        const quotaBlockedList: StudentProfile[] = [];
        
        for (const p of profileList) {
          const studentSubs = currentWeekSubs.filter(s => s.student_id === p.id);
          const hasSuccess = studentSubs.some(s => s.status === 'approved');
          const fails = studentSubs.filter(s => s.status !== 'approved').length;
          if (!hasSuccess && fails >= 5) {
            stuckList.push({ profile: p, count: fails });
          }

          // Проверка квот
          const q = getQuotaForStudent(p.id, p.name);
          const deploys = listDeploymentsForStudent(p.id).length;
          if (deploys >= q.maxDeploys) {
            quotaBlockedList.push(p);
          }
        }
        setStuckStudents(stuckList);
        setQuotaBlockedStudents(quotaBlockedList);

        if ((courseRes.data ?? []).length > 0) setTotalWeeks((courseRes.data as unknown[]).length);
      } catch (e) {
        console.error('TeacherDashboard: ошибка загрузки данных', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdateActiveWeek = async (week: number) => {
    try {
      await supabase.from('cohorts').update({ active_week: week }).eq('id', 1);
      setActiveWeek(week);
    } catch {
      alert('Не удалось изменить активную неделю.');
    }
  };

  const handleSelectQuotaStudent = (id: string) => {
    setQuotaStudentId(id);
    if (!id) {
      setQuotaDraft(null);
      setStudentDeployments([]);
      return;
    }
    const student = students.find((s) => s.id === id);
    setQuotaDraft(getQuotaForStudent(id, student?.name ?? 'Студент'));
    setStudentDeployments(listDeploymentsForStudent(id));
  };

  function handleQuotaFieldChange<K extends keyof ResourceQuota>(field: K, value: ResourceQuota[K]) {
    setQuotaDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  const handleSaveQuota = () => {
    if (!quotaDraft) return;
    upsertQuota(quotaDraft);
    alert(`Квота для «${quotaDraft.studentName}» обновлена.`);
  };

  const handleResetQuotaToDefault = () => {
    if (!quotaDraft) return;
    setQuotaDraft({ ...quotaDraft, ...defaultQuotaTemplate() });
  };

  const handleDeleteStudentDeployment = (id: string) => {
    if (!window.confirm('Удалить этот /preview/:id? Действие необратимо.')) return;
    deleteDeployment(id);
    setStudentDeployments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <section className="teacher-dashboard-section">
      <div className="dashboard-header-block">
        <h2 className="dashboard-title">Кабинет Куратора Курса</h2>
        <p className="dashboard-subtitle">
          Управление расписанием когорты, мониторинг студентов и аудит сданных работ
        </p>
      </div>

      <div className="teacher-grid">
        {/* ── Sidebar ── */}
        <div className="teacher-sidebar">
          <div className="dashboard-card glass-panel control-card">
            <div className="card-header-iconified">
              <Calendar className="card-header-icon" />
              <h3>Расписание Когорты</h3>
            </div>
            <p className="control-card-text">
              Выберите открытую неделю для когорты — контент разблокируется синхронно у всех студентов.
            </p>
            <div className="week-selector-control">
              <label htmlFor="active-week-select">Текущая неделя:</label>
              <select
                id="active-week-select"
                value={activeWeek}
                onChange={(e) => handleUpdateActiveWeek(Number(e.target.value))}
                className="week-select-dropdown"
              >
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Неделя {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dashboard-card glass-panel quotas-card">
            <div className="card-header-iconified">
              <Cpu className="card-header-icon" />
              <h3>Машинные квоты</h3>
            </div>
            <p className="control-card-text">
              Сервер платформы один и без Docker — лимиты RAM/CPU и количество
              внутренних деплоев на ученика раздаём административно. Изменения
              сразу видны ученикам в плашке «Системные ограничения песочницы».
            </p>

            <label className="quota-field-label">
              Студент
              <select
                value={quotaStudentId}
                onChange={(e) => handleSelectQuotaStudent(e.target.value)}
                className="week-select-dropdown"
              >
                <option value="">— выберите —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            </label>

            {quotaDraft && (
              <div className="quota-editor">
                <div className="quota-grid">
                  <label className="quota-field-label">
                    <HardDrive size={12} /> RAM (МБ)
                    <input
                      type="number"
                      min={128}
                      max={4096}
                      step={64}
                      value={quotaDraft.ramMb}
                      onChange={(e) => handleQuotaFieldChange('ramMb', Number(e.target.value))}
                      className="quota-input"
                    />
                  </label>
                  <label className="quota-field-label">
                    <Cpu size={12} /> CPU (%)
                    <input
                      type="number"
                      min={5}
                      max={100}
                      step={5}
                      value={quotaDraft.cpuPercent}
                      onChange={(e) => handleQuotaFieldChange('cpuPercent', Number(e.target.value))}
                      className="quota-input"
                    />
                  </label>
                  <label className="quota-field-label">
                    <Rocket size={12} /> Макс. деплоев
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      value={quotaDraft.maxDeploys}
                      onChange={(e) => handleQuotaFieldChange('maxDeploys', Number(e.target.value))}
                      className="quota-input"
                    />
                  </label>
                  <label className="quota-field-label">
                    ⏱ Сессия превью (сек)
                    <input
                      type="number"
                      min={60}
                      max={1800}
                      step={30}
                      value={quotaDraft.maxRunSeconds}
                      onChange={(e) => handleQuotaFieldChange('maxRunSeconds', Number(e.target.value))}
                      className="quota-input"
                    />
                  </label>
                </div>
                <label className="quota-field-label">
                  Заметка для ученика
                  <textarea
                    rows={2}
                    value={quotaDraft.notes ?? ''}
                    onChange={(e) => handleQuotaFieldChange('notes', e.target.value)}
                    className="quota-input quota-textarea"
                    placeholder="Появится в подсказке у плашки лимитов"
                  />
                </label>

                <div className="quota-actions">
                  <button onClick={handleSaveQuota} className="btn btn-primary btn-sm">
                    <Save size={12} /> Сохранить квоту
                  </button>
                  <button onClick={handleResetQuotaToDefault} className="btn btn-secondary btn-sm">
                    Сбросить к дефолту
                  </button>
                </div>

                {quotaBlockedStudents.find(s => s.id === quotaStudentId) && (
                  <div className="alert-quota-block" style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }}>
                    <strong>Квота исчерпана!</strong> Ученик не может делать новые деплои. Увеличьте лимит или удалите старые деплои.
                  </div>
                )}

                {studentDeployments.length > 0 && (
                  <div className="student-deployments">
                    <h5>Активные внутренние деплои ({studentDeployments.length})</h5>
                    <ul>
                      {studentDeployments.map((d) => (
                        <li key={d.id}>
                          <a
                            href={`/preview/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="deploy-link"
                          >
                            {d.projectName}
                          </a>
                          <span className="deploy-date">
                            {new Date(d.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                          <button
                            onClick={() => handleDeleteStudentDeployment(d.id)}
                            className="btn btn-secondary btn-sm"
                            title="Удалить деплой"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="dashboard-card glass-panel students-card">
            <div className="card-header-iconified">
              <Users className="card-header-icon" />
              <h3>Студенты ({students.length})</h3>
            </div>
            <div className="students-list-view">
              {students.length === 0 ? (
                <p className="empty-label">Нет активных студентов.</p>
              ) : (
                students.map((s) => {
                  const isBlocked = quotaBlockedStudents.some(b => b.id === s.id);
                  const stuckInfo = stuckStudents.find(st => st.profile.id === s.id);
                  return (
                    <div key={s.id} className="student-list-item" onClick={() => handleSelectQuotaStudent(s.id)} style={{ cursor: 'pointer' }}>
                      <div className="student-avatar-mock">{s.name.charAt(0).toUpperCase()}</div>
                      <div className="student-info-col">
                        <span className="student-name">
                          {s.name}
                          {isBlocked && <span className="badge badge-danger" style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 4px', background: '#ef4444', borderRadius: '4px' }}>Квота!</span>}
                          {stuckInfo && <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 4px', background: '#f59e0b', borderRadius: '4px' }}>Застрял ({stuckInfo.count})</span>}
                        </span>
                        <span className="student-email">{s.email}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Main Table ── */}
        <div className="teacher-main">
          <div className="dashboard-card glass-panel submissions-card">
            <div className="card-header-iconified">
              <FileText className="card-header-icon" />
              <h3>Сданные Работы</h3>
            </div>

            {loading ? (
              <p className="loading-label">Загрузка работ…</p>
            ) : submissions.length === 0 ? (
              <p className="empty-label">Пока никто не сдал домашние работы.</p>
            ) : (
              <div className="table-responsive">
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th>Студент</th>
                      <th>Неделя</th>
                      <th>Оценка</th>
                      <th>Статус</th>
                      <th>Дата сдачи</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <div className="table-student-name">
                            {sub.student_profile?.name ?? 'Студент'}
                          </div>
                        </td>
                        <td>Неделя {sub.week_id}</td>
                        <td className="table-score">{sub.score} / 100</td>
                        <td>
                          <span className={`table-status-badge ${sub.status}`}>
                            {sub.status === 'approved' ? 'Зачтено' : sub.status === 'pending' ? 'На проверке' : 'Не зачтено'}
                          </span>
                        </td>
                        <td className="table-date">
                          {new Date(sub.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelected(sub)}
                            className="btn btn-secondary btn-sm"
                          >
                            Детали
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Detail Drawer ── */}
          {selected && (
            <div className="submission-details-drawer glass-panel glow-border-purple animate-fade-in">
              <div className="drawer-header">
                <h4>
                  {selected.student_profile?.name ?? 'Студент'} — Неделя {selected.week_id}
                </h4>
                <button onClick={() => setSelected(null)} className="btn btn-secondary btn-sm">
                  Закрыть
                </button>
              </div>

              <div className="drawer-body">
                <div className="score-summary-row">
                  <div className="score-widget">
                    <span className="score-big">{selected.score}</span>
                    <span>баллов</span>
                  </div>
                  <div className="status-indicator-col">
                    <span>Решение:</span>
                    <span className={`status-text-badge ${selected.status}`}>
                      {selected.status === 'approved' ? 'Зачтено ИИ' : selected.status === 'pending' ? 'На проверке' : 'Требует доработки'}
                    </span>
                  </div>
                </div>

                {selected.payload?.criteria && selected.payload.criteria.length > 0 && (
                  <div className="rubric-summary-block">
                    <h5>Рубрика:</h5>
                    {selected.payload.criteria.map((c, i) => (
                      <div key={i} className={`rubric-row ${c.passed ? 'pass' : 'fail'}`}>
                        <span>{c.passed ? '✓' : '✗'}</span>
                        <span>{c.evidence}</span>
                        {c.advice && <span className="rubric-advice">{c.advice}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {selected.payload?.files && (
                  <div className="student-code-panels">
                    <h5>Артефакты работы:</h5>
                    <div className="code-split-block">
                      {selected.payload.files.html && (
                        <div className="code-file-view">
                          <CodeHighlight
                            code={selected.payload.files.html}
                            language="html"
                            title="index.html"
                          />
                        </div>
                      )}
                      {selected.payload.files.css && (
                        <div className="code-file-view">
                          <CodeHighlight
                            code={selected.payload.files.css}
                            language="css"
                            title="styles.css"
                          />
                        </div>
                      )}
                      {selected.payload.files.js && (
                        <div className="code-file-view">
                          <CodeHighlight
                            code={selected.payload.files.js}
                            language="js"
                            title="app.js"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selected.review_text && (
                  <div className="review-block-details">
                    <h5>Ревью Gemini:</h5>
                    <div className="review-markdown-box">
                      {selected.review_text.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

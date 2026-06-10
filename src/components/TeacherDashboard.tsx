import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, FileText, Calendar } from 'lucide-react';
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
        setSubmissions(
          rawSubs.map((s) => ({
            ...s,
            student_profile: profileList.find((p) => p.id === s.student_id),
          })),
        );

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

          <div className="dashboard-card glass-panel students-card">
            <div className="card-header-iconified">
              <Users className="card-header-icon" />
              <h3>Студенты ({students.length})</h3>
            </div>
            <div className="students-list-view">
              {students.length === 0 ? (
                <p className="empty-label">Нет активных студентов.</p>
              ) : (
                students.map((s) => (
                  <div key={s.id} className="student-list-item">
                    <div className="student-avatar-mock">{s.name.charAt(0).toUpperCase()}</div>
                    <div className="student-info-col">
                      <span className="student-name">{s.name}</span>
                      <span className="student-email">{s.email}</span>
                    </div>
                  </div>
                ))
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
                    <h5>Код решения:</h5>
                    <div className="code-split-block">
                      {selected.payload.files.html && (
                        <div className="code-file-view">
                          <span className="file-tag">index.html</span>
                          <pre className="code-block">
                            <code>{selected.payload.files.html}</code>
                          </pre>
                        </div>
                      )}
                      {selected.payload.files.css && (
                        <div className="code-file-view">
                          <span className="file-tag">styles.css</span>
                          <pre className="code-block">
                            <code>{selected.payload.files.css}</code>
                          </pre>
                        </div>
                      )}
                      {selected.payload.files.js && (
                        <div className="code-file-view">
                          <span className="file-tag">app.js</span>
                          <pre className="code-block">
                            <code>{selected.payload.files.js}</code>
                          </pre>
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

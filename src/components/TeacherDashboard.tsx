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

interface HomeworkSubmission {
  id: string;
  week_id: number;
  student_id: string;
  score: number;
  status: string;
  submitted_at: string;
  code_html: string;
  code_css: string;
  code_js: string;
  review_text: string;
  student_profile?: StudentProfile;
}

export const TeacherDashboard: React.FC = () => {
  const [activeWeek, setActiveWeek] = useState(1);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      // 1. Load active week for Cohort 1
      const { data: cohort } = await supabase
        .from('cohorts')
        .select('*')
        .eq('id', 1)
        .single();
      if (cohort) {
        setActiveWeek(cohort.active_week as number);
      }

      // 2. Load all student profiles
      const { data: profilesList } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');
      if (profilesList) {
        setStudents(profilesList as unknown as StudentProfile[]);
      }

      // 3. Load all submitted homeworks
      const { data: homeworksList } = await supabase
        .from('homeworks')
        .select('*');
      
      if (homeworksList) {
        // Hydrate profiles on mock database fallback
        const hydrated = (homeworksList as unknown as HomeworkSubmission[]).map((hw) => {
          const studentProfile = (profilesList as unknown as StudentProfile[] || []).find((p) => p.id === hw.student_id);
          return { ...hw, student_profile: studentProfile } as HomeworkSubmission;
        });
        setSubmissions(hydrated);
      }
    } catch (err) {
      console.error("Error loading teacher panel:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
  }, []);

  const handleUpdateActiveWeek = async (week: number) => {
    try {
      await supabase.from('cohorts').update({ active_week: week }).eq('id', 1);
      setActiveWeek(week);
      alert(`Активная неделя когорты успешно изменена на ${week}! У всех студентов разблокирован соответствующий контент.`);
    } catch {
      alert("Не удалось изменить активную неделю.");
    }
  };

  return (
    <section className="teacher-dashboard-section">
      <div className="dashboard-header-block">
        <h2 className="dashboard-title">Кабинет Куратора Курса</h2>
        <p className="dashboard-subtitle">Управление расписанием когорты, мониторинг студентов и аудит сданных работ</p>
      </div>

      <div className="teacher-grid">
        {/* Left Column: Stats & Week Control */}
        <div className="teacher-sidebar">
          {/* Cohort Week Control */}
          <div className="dashboard-card glass-panel control-card">
            <div className="card-header-iconified">
              <Calendar className="card-header-icon" />
              <h3>Расписание Когорты</h3>
            </div>
            <p className="control-card-text">
              Выберите текущую открытую неделю для вашей учебной группы. Уроки и слайды будут разблокированы синхронно.
            </p>
            
            <div className="week-selector-control">
              <label htmlFor="active-week-select">Текущая неделя:</label>
              <select
                id="active-week-select"
                value={activeWeek}
                onChange={(e) => handleUpdateActiveWeek(Number(e.target.value))}
                className="week-select-dropdown"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                  <option key={w} value={w}>
                    Неделя {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Students list */}
          <div className="dashboard-card glass-panel students-card">
            <div className="card-header-iconified">
              <Users className="card-header-icon" />
              <h3>Зарегистрировано Студентов ({students.length})</h3>
            </div>
            
            <div className="students-list-view">
              {students.length > 0 ? (
                students.map((student) => (
                  <div key={student.id} className="student-list-item">
                    <div className="student-avatar-mock">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="student-info-col">
                      <span className="student-name">{student.name}</span>
                      <span className="student-email">{student.email}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-label">Нет активных студентов.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Submissions Table */}
        <div className="teacher-main">
          <div className="dashboard-card glass-panel submissions-card">
            <div className="card-header-iconified">
              <FileText className="card-header-icon" />
              <h3>Сданные Работы Студентов</h3>
            </div>

            {loading ? (
              <p className="loading-label">Идет загрузка работ...</p>
            ) : submissions.length > 0 ? (
              <div className="table-responsive">
                <table className="submissions-table">
                  <thead>
                    <tr>
                      <th>Студент</th>
                      <th>Неделя</th>
                      <th>Оценка</th>
                      <th>Статус</th>
                      <th>Дата сдачи</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <div className="table-student-name">
                            {sub.student_profile?.name || 'Иван Иванов'}
                          </div>
                        </td>
                        <td>Неделя {sub.week_id}</td>
                        <td className="table-score">{sub.score} / 100</td>
                        <td>
                          <span className={`table-status-badge ${sub.status}`}>
                            {sub.status === 'approved' ? 'Зачтено' : 'Не зачтено'}
                          </span>
                        </td>
                        <td className="table-date">
                          {new Date(sub.submitted_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="btn btn-secondary btn-sm"
                          >
                            Подробности
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-label">Пока никто не сдал домашние работы.</p>
            )}
          </div>

          {/* Submission Details Modal Drawer */}
          {selectedSubmission && (
            <div className="submission-details-drawer glass-panel glow-border-purple animate-fade-in">
              <div className="drawer-header">
                <h4>
                  Детали Работы: {selectedSubmission.student_profile?.name || 'Студент'} (Неделя {selectedSubmission.week_id})
                </h4>
                <button onClick={() => setSelectedSubmission(null)} className="btn btn-secondary btn-sm">
                  Закрыть
                </button>
              </div>

              <div className="drawer-body">
                <div className="score-summary-row">
                  <div className="score-widget">
                    <span className="score-big">{selectedSubmission.score}</span>
                    <span>баллов</span>
                  </div>
                  <div className="status-indicator-col">
                    <span>Решение:</span>
                    <span className={`status-text-badge ${selectedSubmission.status}`}>
                      {selectedSubmission.status === 'approved' ? 'Зачтено ИИ' : 'Требует доработки'}
                    </span>
                  </div>
                </div>

                {/* Show Student Code */}
                <div className="student-code-panels">
                  <h5>Код решения:</h5>
                  <div className="code-split-block">
                    {selectedSubmission.code_html && (
                      <div className="code-file-view">
                        <span className="file-tag">index.html</span>
                        <pre className="code-block"><code>{selectedSubmission.code_html}</code></pre>
                      </div>
                    )}
                    {selectedSubmission.code_css && (
                      <div className="code-file-view">
                        <span className="file-tag">styles.css</span>
                        <pre className="code-block"><code>{selectedSubmission.code_css}</code></pre>
                      </div>
                    )}
                    {selectedSubmission.code_js && (
                      <div className="code-file-view">
                        <span className="file-tag">main.js</span>
                        <pre className="code-block"><code>{selectedSubmission.code_js}</code></pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Show Review Text */}
                <div className="review-block-details">
                  <h5>Отчет Gemini:</h5>
                  <div className="review-markdown-box">
                    {selectedSubmission.review_text.split('\n').map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

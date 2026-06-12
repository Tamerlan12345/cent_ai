import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ModuleTimeline } from './components/ModuleTimeline';
import { SlideDeck } from './components/SlideDeck';
import { PracticeTimer } from './components/PracticeTimer';
import { Quiz } from './components/Quiz';
import { ResourceLibrary } from './components/ResourceLibrary';
import { Auth } from './components/Auth';
import { CodeEditor } from './components/CodeEditor';
import { PromptBuilder } from './components/PromptBuilder';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TourPage } from './components/tour/TourPage';
import { DeployPreview } from './components/DeployPreview';
import { PracticeMissionRunner } from './components/PracticeMissionRunner';
import { supabase } from './supabaseClient';
import { loadCourseModules } from './lib/contentService';
import { loadProgress, saveWeekCompleted, saveChecklistItem } from './lib/progressService';
import type { UserProfile, CourseModule } from './types';
import {
  AlertOctagon,
  Bot,
  CheckSquare,
  GraduationCap,
  Home,
  Lock,
  Route as RouteIcon,
  Send,
  Target,
} from 'lucide-react';
import './App.css';

const weeklyPracticePlan = [
  {
    weekId: 1,
    lesson: 'Собрать идею MVP, AI-наставника и первый Canvas',
    artifact: 'vibe-canvas.md',
    handoff: {
      tool: 'Gemini / Gem',
      action: 'Создайте личного MVP-наставника и попросите его задать 10 вопросов по идее.',
      bringBack: 'Готовый Canvas и 1 выбранная идея.',
    },
    homework: [
      'Выбрать одну идею MVP из 10 вариантов',
      'Заполнить Vibe Coding Canvas',
      'Описать главный сценарий пользователя в 5 шагах',
    ],
  },
  {
    weekId: 2,
    lesson: 'Превратить Canvas в PROJECT_BRIEF, Screen Map и AGENTS.md',
    artifact: 'PROJECT_BRIEF.md + AGENTS.md',
    handoff: {
      tool: 'Antigravity',
      action: 'Откройте новый проект, вставьте brief и попросите агента собрать структуру файлов.',
      bringBack: 'PROJECT_BRIEF.md, Screen Map и AGENTS.md.',
    },
    homework: [
      'Собрать контекстный пакет проекта',
      'Проверить, что MVP ограничен 3 функциями',
      'Подготовить первый запрос для Antigravity',
    ],
  },
  {
    weekId: 3,
    lesson: 'Собрать первый рабочий сценарий MVP в IDE',
    artifact: 'Рабочий MVP-снапшот',
    handoff: {
      tool: 'Antigravity Manager',
      action: 'Повторите главный экран через Builder-агента и попросите Reviewer объяснить diff.',
      bringBack: 'Снапшот, скриншот и 3 вывода по работе агента.',
    },
    homework: [
      'Повторить главный экран в Antigravity',
      'Сделать snapshot/commit после рабочего состояния',
      'Записать 3 пункта, где агент ошибся или помог',
    ],
  },
  {
    weekId: 4,
    lesson: 'Закрыть QA, безопасность, внутренний deploy и защиту',
    artifact: 'deploy-link + defense-script',
    handoff: {
      tool: 'Gemini / GPT / Antigravity',
      action: 'Запустите QA/Security-роль, затем попросите Demo Coach собрать речь защиты.',
      bringBack: 'Ссылка на preview, Quality Gate и 3-минутная речь.',
    },
    homework: [
      'Прогнать финальный Quality Gate',
      'Подготовить 3-минутную речь защиты',
      'Сохранить roadmap следующих 3 улучшений',
    ],
  },
] as const;

function App() {
  const navigate = useNavigate();
  const location = useLocation(); // для плавного перехода между страницами

  const [selectedWeekId, setSelectedWeekId] = useState<number>(1);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('centras_theme') as 'dark' | 'light') || 'dark',
  );

  // Load course content (Supabase or bundle fallback)
  useEffect(() => {
    loadCourseModules().then(setCourseModules);
  }, []);

  // Load progress when user session changes
  useEffect(() => {
    loadProgress(userProfile?.id ?? null).then((p) => {
      setCompletedWeeks(p.completedWeeks);
      setChecklist(p.checklist);
    });
  }, [userProfile?.id]);

  useEffect(() => {
    const weekParam = new URLSearchParams(location.search).get('week');
    const week = weekParam ? Number(weekParam) : NaN;
    if (Number.isInteger(week) && week >= 1 && week <= 4 && week !== selectedWeekId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedWeekId(week);
    }
  }, [location.search, selectedWeekId]);

  // Restore auth session
  useEffect(() => {
    void (async () => {
      const authRes = await supabase.auth.getUser() as { data: { user: UserProfile | null } };
      if (!authRes.data.user) return;
      const profileRes = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authRes.data.user.id)
        .single() as { data: UserProfile | null };
      setUserProfile(profileRes.data ?? authRes.data.user);
    })();
  }, []);

  // Fetch cohort active week
  useEffect(() => {
    void (async () => {
      try {
        const res = await supabase
          .from('cohorts')
          .select('active_week')
          .eq('id', 1)
          .single() as { data: { active_week: number } | null };
        if (res.data) setActiveWeek(res.data.active_week);
      } catch {
        /* cohort missing in demo mode is expected */
      }
    })();
  }, [userProfile?.id]);

  // Theme persistence
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('centras_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));

  const handleCompleteWeek = async (weekId: number) => {
    if (completedWeeks.includes(weekId)) return;
    setCompletedWeeks((prev) => (prev.includes(weekId) ? prev : [...prev, weekId]));
    await saveWeekCompleted(userProfile?.id ?? null, weekId);
  };

  const handleSelectWeek = (weekId: number, tabRoute: string) => {
    setSelectedWeekId(weekId);
    navigate(`${tabRoute}?week=${weekId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    navigate('/');
  };

  const handleCheckItem = async (itemId: string) => {
    const next = !checklist[itemId];
    setChecklist((prev) => ({ ...prev, [itemId]: next }));
    await saveChecklistItem(userProfile?.id ?? null, selectedWeekId, itemId, next);
  };

  const activeModule = courseModules.find((m) => m.id === selectedWeekId) || courseModules[0];
  const activePracticePlan =
    weeklyPracticePlan.find((plan) => plan.weekId === selectedWeekId) ?? weeklyPracticePlan[0];
  const isWeekLocked = userProfile?.role === 'student' && selectedWeekId > activeWeek;
  const authReturnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  const lockedScreen = (
    <div className="locked-week-container glass-panel glow-border-purple text-center animate-fade-in">
      <Lock size={48} className="lock-icon" />
      <h3>Модуль заблокирован куратором</h3>
      <p>Этот учебный блок откроется позже согласно календарному плану когорты.</p>
      <div className="locked-week-meta">
        <span>
          Текущая открытая неделя: <strong>Неделя {activeWeek}</strong>
        </span>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        completedWeeks={completedWeeks}
        totalModules={courseModules.length || 4}
        userProfile={userProfile}
        onSignOut={handleSignOut}
      />

      <div className="content-viewport">
        {/* key по pathname перезапускает анимацию входа при смене маршрута */}
        <div key={location.pathname} className="route-transition">
        <Routes>
          {/* ── Home ── */}
          <Route
            path="/"
            element={
              <main className="main-content">
                <Hero onStartTraining={() => navigate('/tour')} />
                <ModuleTimeline
                  modules={courseModules}
                  completedWeeks={completedWeeks}
                  onSelectWeek={handleSelectWeek}
                  activeWeek={userProfile?.role === 'student' ? activeWeek : undefined}
                />
              </main>
            }
          />

          {/* ── Interactive Onboarding Tour ── */}
          <Route path="/tour" element={<TourPage userProfile={userProfile} />} />

          {/* ── Внутренний деплой курса (вместо внешнего хостинга) ── */}
          <Route path="/preview/:id" element={<DeployPreview />} />

          {/* ── Program overview ── */}
          <Route
            path="/program"
            element={
              <main className="main-content">
                <ModuleTimeline
                  modules={courseModules}
                  completedWeeks={completedWeeks}
                  onSelectWeek={handleSelectWeek}
                  activeWeek={userProfile?.role === 'student' ? activeWeek : undefined}
                />
              </main>
            }
          />

          {/* ── Slide deck ── */}
          <Route
            path="/slides"
            element={
              !userProfile ? (
                <Navigate to="/auth" replace state={{ returnTo: `${location.pathname}${location.search}` }} />
              ) : (
                <main className="main-content">
                  {isWeekLocked ? (
                    lockedScreen
                  ) : (
                    <SlideDeck
                      modules={courseModules}
                      selectedWeekId={selectedWeekId}
                      setSelectedWeekId={setSelectedWeekId}
                    />
                  )}
                </main>
              )
            }
          />

          {/* ── Practice workspace ── */}
          <Route
            path="/practice"
            element={
              !userProfile ? (
                <Navigate to="/auth" replace state={{ returnTo: `${location.pathname}${location.search}` }} />
              ) : (
                <main className="main-content practice-workspace-page">
                  <div className="practice-header-section">
                    <div className="practice-title-block">
                      <span className="practice-page-eyebrow">
                        4 недели · 4 занятия · один MVP
                      </span>
                      <h2 className="practice-page-title">MVP-мастер</h2>
                      <p className="practice-page-subtitle">
                        Практика встроена в маршрут: на занятии делаем короткие миссии,
                        на неделю остается только понятный артефакт проекта.
                      </p>
                    </div>
                    <div className="practice-week-nav">
                      {courseModules.map((m) => {
                        const locked = userProfile.role === 'student' && m.id > activeWeek;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={locked}
                            onClick={() => {
                              setSelectedWeekId(m.id);
                              navigate(`/practice?week=${m.id}`, { replace: true });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`practice-week-btn ${m.id === selectedWeekId ? 'active' : ''} ${locked ? 'locked' : ''}`}
                          >
                            {locked && <Lock size={10} className="inline-icon" />} Неделя {m.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="practice-path-strip glass-panel">
                    {weeklyPracticePlan.map((plan) => {
                      const locked = userProfile.role === 'student' && plan.weekId > activeWeek;
                      return (
                        <button
                          key={plan.weekId}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            setSelectedWeekId(plan.weekId);
                            navigate(`/practice?week=${plan.weekId}`, { replace: true });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`practice-path-step ${plan.weekId === selectedWeekId ? 'active' : ''} ${
                            completedWeeks.includes(plan.weekId) ? 'completed' : ''
                          } ${locked ? 'locked' : ''}`}
                        >
                          <span className="practice-path-number">{locked ? <Lock size={13} /> : plan.weekId}</span>
                          <span className="practice-path-copy">
                            <strong>{plan.artifact}</strong>
                            <small>{locked ? `Откроется после недели ${activeWeek}` : plan.lesson}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isWeekLocked ? (
                    lockedScreen
                  ) : activeModule ? (
                    <>
                      <div className="practice-flow-rail glass-panel">
                        <div>
                          <span>1</span>
                          <strong>Миссии</strong>
                          <small>Делаем на занятии</small>
                        </div>
                        <div>
                          <span>2</span>
                          <strong>Домашка</strong>
                          <small>Один недельный артефакт</small>
                        </div>
                        <div>
                          <span>3</span>
                          <strong>Quiz</strong>
                          <small>Порог зачёта 80%</small>
                        </div>
                      </div>

                      <div className="workspace-grid">
                        <div className="workspace-left">
                        <div className="task-detail-card glass-panel">
                          <div className="card-header-iconified">
                            <Target className="card-header-icon" />
                            <h3>Занятие: {activeModule.practice.title}</h3>
                          </div>
                          <div className="practice-lesson-summary">
                            <RouteIcon size={16} />
                            <span>{activePracticePlan.lesson}</span>
                          </div>
                          <p className="task-long-desc">{activeModule.practice.description}</p>
                          <div className="task-steps">
                            <h4>Инструкция по шагам:</h4>
                            <ol>
                              {(activeModule.practice.steps || []).map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div className="task-hints">
                            <h4>Подсказки:</h4>
                            <ul>
                              {(activeModule.practice.hints || []).map((hint, idx) => (
                                <li key={idx}>{hint}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="weekly-homework-card glass-panel">
                          <div className="card-header-iconified">
                            <Home className="card-header-icon" />
                            <h3>Домашка на неделю</h3>
                          </div>
                          <p>
                            Не больше одного артефакта: <strong>{activePracticePlan.artifact}</strong>.
                          </p>
                          <ul>
                            {activePracticePlan.homework.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="external-handoff-card glass-panel">
                          <div className="card-header-iconified">
                            <Bot className="card-header-icon" />
                            <h3>Связка с внешним инструментом</h3>
                          </div>
                          <div className="handoff-route">
                            <div>
                              <span>1 · Здесь</span>
                              <p>Пройдите миссии недели в MVP-мастере.</p>
                            </div>
                            <div>
                              <span>2 · {activePracticePlan.handoff.tool}</span>
                              <p>{activePracticePlan.handoff.action}</p>
                            </div>
                            <div>
                              <span>3 · Артефакт</span>
                              <p>{activePracticePlan.handoff.bringBack}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm handoff-copy-btn"
                            onClick={() => {
                              const text = [
                                `Неделя ${selectedWeekId}: ${activePracticePlan.lesson}`,
                                `Инструмент: ${activePracticePlan.handoff.tool}`,
                                `Сделать: ${activePracticePlan.handoff.action}`,
                                `Вернуть в курс: ${activePracticePlan.handoff.bringBack}`,
                              ].join('\n');
                              void navigator.clipboard.writeText(text);
                            }}
                          >
                            <Send size={13} /> Скопировать шаг для ИИ
                          </button>
                        </div>

                        {!!activeModule.practice.checklist?.length && (
                          <div className="checklist-card glass-panel">
                            <div className="card-header-iconified">
                              <CheckSquare className="card-header-icon" />
                              <h3>Чек-лист готовности к ревью (DoD)</h3>
                            </div>
                            <div className="checklist-items-container">
                              {activeModule.practice.checklist.map((item, idx) => {
                                const itemId = `${selectedWeekId}-check-${idx}`;
                                const isChecked = !!checklist[itemId];
                                return (
                                  <label
                                    key={idx}
                                    className={`checklist-item-row ${isChecked ? 'checked' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleCheckItem(itemId)}
                                    />
                                    <span>{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="workspace-right">
                        <PracticeTimer
                          key={selectedWeekId}
                          durationMinutes={activeModule.practice.durationMinutes}
                        />

                        <div className="prompt-builder-interactive-card glass-panel">
                          <div className="card-header-iconified">
                            <GraduationCap className="card-header-icon" />
                            <h3>
                              {activeModule.practice.mode === 'mission'
                                ? 'MVP-мастер недели'
                                : activeModule.practice.type === 'prompt'
                                  ? 'Конструктор инженерных запросов'
                                  : 'IDE проекта'}
                            </h3>
                          </div>
                          {activeModule.practice.mode === 'mission' ? (
                            <PracticeMissionRunner
                              key={selectedWeekId}
                              practice={activeModule.practice}
                              weekTitle={activeModule.title}
                              weekId={selectedWeekId}
                              onHomeworkApproved={() => handleCompleteWeek(selectedWeekId)}
                              userProfile={userProfile}
                            />
                          ) : activeModule.practice.type === 'prompt' ? (
                            <PromptBuilder
                              key={selectedWeekId}
                              practice={activeModule.practice}
                              weekTitle={activeModule.title}
                              weekId={selectedWeekId}
                              onHomeworkApproved={() => handleCompleteWeek(selectedWeekId)}
                            />
                          ) : (
                            <CodeEditor
                              key={selectedWeekId}
                              weekId={selectedWeekId}
                              weekTitle={activeModule.title}
                              dodCriteria={activeModule.practice.checklist || []}
                              onHomeworkApproved={() => handleCompleteWeek(selectedWeekId)}
                              userProfile={userProfile}
                            />
                          )}
                        </div>

                        <div className="quiz-container-workspace">
                          <Quiz
                            key={selectedWeekId}
                            questions={activeModule.quiz}
                            weekId={selectedWeekId}
                            onComplete={handleCompleteWeek}
                          />
                        </div>
                      </div>
                      </div>
                    </>
                  ) : null}
                </main>
              )
            }
          />

          {/* ── Resources ── */}
          <Route
            path="/resources"
            element={
              <main className="main-content">
                <ResourceLibrary />
              </main>
            }
          />

          {/* ── Auth ── */}
          <Route
            path="/auth"
            element={
              <main className="main-content">
                <Auth
                  onAuthSuccess={(profile) => {
                    setUserProfile(profile);
                    navigate(authReturnTo ?? '/');
                  }}
                />
              </main>
            }
          />

          {/* ── Teacher / Admin dashboard ── */}
          <Route
            path="/teacher"
            element={
              !userProfile ? (
                <Navigate to="/auth" replace state={{ returnTo: `${location.pathname}${location.search}` }} />
              ) : userProfile.role !== 'teacher' && userProfile.role !== 'admin' ? (
                <div className="not-found-page text-center">
                  <AlertOctagon size={48} className="error-color" />
                  <h2>Доступ Запрещен</h2>
                  <p>Эта панель доступна только кураторам и администраторам курса.</p>
                  <button onClick={() => navigate('/')} className="btn btn-primary">
                    Вернуться на главную
                  </button>
                </div>
              ) : (
                <main className="main-content">
                  <TeacherDashboard />
                </main>
              )
            }
          />

          {/* ── 404 ── */}
          <Route
            path="*"
            element={
              <div className="not-found-page text-center">
                <GraduationCap size={48} />
                <h2>Страница не найдена</h2>
                <button onClick={() => navigate('/')} className="btn btn-primary">
                  Вернуться на главную
                </button>
              </div>
            }
          />
        </Routes>
        </div>
      </div>

      <footer className="global-footer">
        <div className="footer-container">
          <p>
            © {new Date().getFullYear()} Centras CodeAI. Проект разработан для обучения новичков
            вайбкодингу без хаоса.
          </p>
          <p className="footer-meta">
            Сделано на React + Vite + TypeScript. Поддерживается интеграция с Supabase & Gemini API.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

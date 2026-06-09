import { useState, useEffect } from 'react';
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
import { supabase } from './supabaseClient';
import { courseModules } from './content/courseData';
import type { UserProfile } from './types';
import { Info, CheckSquare, GraduationCap, Lock, AlertOctagon } from 'lucide-react';
import './App.css';

function App() {
  // Navigation State
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [selectedWeekId, setSelectedWeekId] = useState<number>(1);

  // Authenticated User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Cohort active week (synchronized from server/mock db)
  const [activeWeek, setActiveWeek] = useState<number>(1);

  // User Progress persisted in localStorage
  const [completedWeeks, setCompletedWeeks] = useState<number[]>(() => {
    const saved = localStorage.getItem('centras_completed_weeks');
    return saved ? JSON.parse(saved) : [];
  });

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('centras_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Checkbox checklist state per week
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('centras_checklist');
    return saved ? JSON.parse(saved) : {};
  });

  // Check session on mount
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        setUserProfile((profile as unknown as UserProfile) || (data.user as unknown as UserProfile));
      }
    };
    initSession();
  }, []);

  // Fetch active week from cohort DB whenever route or profile changes
  const loadCohortActiveWeek = async () => {
    try {
      const { data } = await supabase.from('cohorts').select('active_week').eq('id', 1).single();
      if (data) {
        setActiveWeek(data.active_week);
      }
    } catch (e) {
      console.warn("Cohort data load skipped (Mock Mode active)", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCohortActiveWeek();
  }, [currentRoute, userProfile]);

  // Handle saving completed weeks
  useEffect(() => {
    localStorage.setItem('centras_completed_weeks', JSON.stringify(completedWeeks));
  }, [completedWeeks]);

  // Handle theme transitions
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('centras_theme', theme);
  }, [theme]);

  // Save checklist state
  useEffect(() => {
    localStorage.setItem('centras_checklist', JSON.stringify(checklistState));
  }, [checklistState]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleCompleteWeek = (weekId: number) => {
    if (!completedWeeks.includes(weekId)) {
      setCompletedWeeks((prev) => [...prev, weekId]);
    }
  };

  const handleSelectWeek = (weekId: number, tabRoute: string) => {
    setSelectedWeekId(weekId);
    setCurrentRoute(tabRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setCurrentRoute('/');
  };

  const activeModule = courseModules.find((m) => m.id === selectedWeekId) || courseModules[0];

  const handleCheckItem = (itemId: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Guard decorator to enforce login
  const withAuthGuard = (element: React.ReactNode) => {
    if (!userProfile) {
      return <Auth onAuthSuccess={(profile) => setUserProfile(profile)} />;
    }
    return element;
  };

  // Guard decorator to enforce teacher permissions
  const withTeacherGuard = (element: React.ReactNode) => {
    if (!userProfile) {
      return <Auth onAuthSuccess={(profile) => setUserProfile(profile)} />;
    }
    if (userProfile.role !== 'teacher' && userProfile.role !== 'admin') {
      return (
        <div className="not-found-page text-center">
          <AlertOctagon size={48} className="error-color" />
          <h2>Доступ Запрещен</h2>
          <p>Эта панель доступна только кураторам и администраторам курса.</p>
          <button onClick={() => setCurrentRoute('/')} className="btn btn-primary">
            Вернуться на главную
          </button>
        </div>
      );
    }
    return element;
  };

  // Check if week is locked for current student (weekId > cohort active_week)
  const isWeekLocked = userProfile?.role === 'student' && selectedWeekId > activeWeek;

  const renderLockedScreen = () => (
    <div className="locked-week-container glass-panel glow-border-purple text-center animate-fade-in">
      <Lock size={48} className="lock-icon" />
      <h3>Модуль заблокирован куратором</h3>
      <p>Этот учебный блок откроется для вашей когорты позже согласно календарному плану обучения группы.</p>
      <div className="locked-week-meta">
        <span>Текущая открытая неделя: <strong>Неделя {activeWeek}</strong></span>
      </div>
    </div>
  );

  // Render active route contents
  const renderContent = () => {
    switch (currentRoute) {
      case '/':
        return (
          <main className="main-content">
            <Hero onStartTraining={() => setCurrentRoute('/slides')} />
            <ModuleTimeline
              modules={courseModules}
              completedWeeks={completedWeeks}
              onSelectWeek={handleSelectWeek}
            />
          </main>
        );
      case '/program':
        return (
          <main className="main-content">
            <ModuleTimeline
              modules={courseModules}
              completedWeeks={completedWeeks}
              onSelectWeek={handleSelectWeek}
            />
          </main>
        );
      case '/slides':
        return withAuthGuard(
          <main className="main-content">
            {isWeekLocked ? (
              renderLockedScreen()
            ) : (
              <SlideDeck
                modules={courseModules}
                selectedWeekId={selectedWeekId}
                setSelectedWeekId={setSelectedWeekId}
              />
            )}
          </main>
        );
      case '/practice':
        return withAuthGuard(
          <main className="main-content practice-workspace-page">
            <div className="practice-header-section">
              <h2 className="practice-page-title">Практическая Инженерная Лаборатория</h2>
              <div className="practice-week-nav">
                {courseModules.map((m) => {
                  const isLocked = userProfile?.role === 'student' && m.id > activeWeek;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedWeekId(m.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`practice-week-btn ${m.id === selectedWeekId ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    >
                      {isLocked ? <Lock size={10} className="inline-icon" /> : null} Неделя {m.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {isWeekLocked ? (
              renderLockedScreen()
            ) : (
              <div className="workspace-grid">
                {/* Left Column: Task Info & Steps */}
                <div className="workspace-left">
                  <div className="task-detail-card glass-panel">
                    <div className="card-header-iconified">
                      <Info className="card-header-icon" />
                      <h3>Задание: {activeModule.practice.title}</h3>
                    </div>
                    <p className="task-long-desc">{activeModule.practice.description}</p>

                    <div className="task-steps">
                      <h4>Инструкция по шагам:</h4>
                      <ol>
                        {activeModule.practice.steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="task-hints">
                      <h4>Подсказки:</h4>
                      <ul>
                        {activeModule.practice.hints.map((hint, idx) => (
                          <li key={idx}>{hint}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* DoD checklist */}
                  <div className="checklist-card glass-panel">
                    <div className="card-header-iconified">
                      <CheckSquare className="card-header-icon" />
                      <h3>Чек-лист готовности к ревью (DoD)</h3>
                    </div>
                    <div className="checklist-items-container">
                      {activeModule.practice.checklist.map((item, idx) => {
                        const itemId = `${selectedWeekId}-check-${idx}`;
                        const isChecked = !!checklistState[itemId];
                        return (
                          <label key={idx} className={`checklist-item-row ${isChecked ? 'checked' : ''}`}>
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
                </div>

                {/* Right Column: Timer, IDE Monaco Editor Sandbox, and Quiz */}
                <div className="workspace-right">
                  <PracticeTimer key={selectedWeekId} durationMinutes={activeModule.practice.durationMinutes} />

                  <div className="prompt-builder-interactive-card glass-panel">
                    <div className="card-header-iconified">
                      <GraduationCap className="card-header-icon" />
                      <h3>
                        {activeModule.practice.type === 'prompt'
                          ? 'Конструктор инженерных запросов'
                          : 'IDE Песочница Домашней Работы'}
                      </h3>
                    </div>
                    {activeModule.practice.type === 'prompt' ? (
                      <PromptBuilder
                        key={selectedWeekId}
                        practice={activeModule.practice}
                        weekTitle={activeModule.title}
                        studentId={userProfile?.id || ''}
                        weekId={selectedWeekId}
                        onHomeworkApproved={() => handleCompleteWeek(selectedWeekId)}
                      />
                    ) : (
                      <CodeEditor
                        key={selectedWeekId}
                        weekId={selectedWeekId}
                        weekTitle={activeModule.title}
                        dodCriteria={activeModule.practice.checklist}
                        studentId={userProfile?.id || ''}
                        onHomeworkApproved={() => handleCompleteWeek(selectedWeekId)}
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
            )}
          </main>
        );
      case '/resources':
        return (
          <main className="main-content">
            <ResourceLibrary />
          </main>
        );
      case '/teacher':
        return withTeacherGuard(
          <main className="main-content">
            <TeacherDashboard />
          </main>
        );
      case '/auth':
        return (
          <main className="main-content">
            <Auth onAuthSuccess={(profile) => {
              setUserProfile(profile);
              setCurrentRoute('/');
            }} />
          </main>
        );
      default:
        return (
          <div className="not-found-page text-center">
            <GraduationCap size={48} />
            <h2>Страница не найдена</h2>
            <button onClick={() => setCurrentRoute('/')} className="btn btn-primary">
              Вернуться на главную
            </button>
          </div>
        );
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        currentRoute={currentRoute}
        setCurrentRoute={setCurrentRoute}
        theme={theme}
        toggleTheme={toggleTheme}
        completedWeeks={completedWeeks}
        userProfile={userProfile}
        onSignOut={handleSignOut}
      />

      <div className="content-viewport">{renderContent()}</div>

      <footer className="global-footer">
        <div className="footer-container">
          <p>© {new Date().getFullYear()} Centras CodeAI. Проект разработан для обучения новичков вайбкодингу без хаоса.</p>
          <p className="footer-meta">Сделано на React + Vite + TypeScript. Поддерживается интеграция с Supabase & Gemini API.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

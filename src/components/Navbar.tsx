import React from 'react';
import { Sun, Moon, GraduationCap, Trophy, LogOut } from 'lucide-react';
import type { UserProfile } from '../types';
import './Navbar.css';

interface NavbarProps {
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  completedWeeks: number[];
  userProfile: UserProfile | null;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  setCurrentRoute,
  theme,
  toggleTheme,
  completedWeeks,
  userProfile,
  onSignOut,
}) => {
  const navItems = [
    { id: '/', label: 'Главная' },
    { id: '/program', label: 'Программа' },
    { id: '/slides', label: 'Слайды' },
    { id: '/practice', label: 'Практика' },
    { id: '/resources', label: 'Ресурсы' },
  ];

  // If user is a teacher or admin, add Curator panel link
  if (userProfile?.role === 'teacher' || userProfile?.role === 'admin') {
    navItems.push({ id: '/teacher', label: userProfile?.role === 'admin' ? 'Админ' : 'Куратор' });
  }

  const progressPercentage = Math.round((completedWeeks.length / 10) * 100);

  return (
    <header className="navbar-header glass-panel">
      <div className="navbar-container">
        <div className="logo-section" onClick={() => setCurrentRoute('/')}>
          <GraduationCap className="logo-icon animate-pulse" />
          <span className="logo-text">
            Centras <span className="logo-accent">CodeAI</span>
          </span>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentRoute(item.id)}
              className={`nav-link ${currentRoute === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="navbar-actions">
          {/* Progress widget */}
          {userProfile && (
            <div className="progress-widget" title={`Завершено ${completedWeeks.length} из 8 недель`}>
              <Trophy className="progress-icon" />
              <div className="progress-text-container">
                <span className="progress-label">Прогресс</span>
                <span className="progress-value">{progressPercentage}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
          )}

          {/* Theme toggler */}
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Смена темы оформления">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User state */}
          {userProfile ? (
            <div className="user-profile-badge-nav">
              <span className="user-name-label" title={userProfile.email}>
                {userProfile.name}
              </span>
              <button onClick={onSignOut} className="theme-toggle-btn sign-out-btn" title="Выйти из аккаунта">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setCurrentRoute('/auth')} className="btn btn-secondary btn-sm">
              Войти
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

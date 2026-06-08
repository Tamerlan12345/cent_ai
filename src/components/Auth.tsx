import React, { useState } from 'react';
import { supabase, isRealSupabaseConfigured } from '../supabaseClient';
import { GraduationCap, Mail, Lock, User, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../types';
import './Auth.css';

interface AuthProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
              role,
            },
          },
        });

        if (error) throw error;
        
        // In real Supabase, they might need email verification or profile is loaded automatically
        if (data.user) {
          // Fetch created profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          onAuthSuccess((profile as unknown as UserProfile) || (data.user as unknown as UserProfile));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Fetch created profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          onAuthSuccess((profile as unknown as UserProfile) || (data.user as unknown as UserProfile));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка авторизации.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper shortcut for quick testing in mock/demo mode
  const handleQuickDemoLogin = async (demoRole: 'student' | 'teacher' | 'admin') => {
    setLoading(true);
    setErrorMsg(null);
    const demoEmail = demoRole === 'teacher' ? 'teacher@cent.ai' : demoRole === 'admin' ? 'admin' : 'student@cent.ai';
    const demoPassword = demoRole === 'admin' ? 'admin12345' : 'password123';
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });
      if (error) throw error;
      if (data.user) {
        onAuthSuccess(data.user as unknown as UserProfile);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка демо-входа';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel glow-border-cyan animate-fade-in">
        <div className="auth-header">
          <GraduationCap className="auth-logo-icon" />
          <h2>Вход в Centras CodeAI</h2>
          <p>
            {isRealSupabaseConfigured
              ? 'Авторизация в вашей Supabase облачной базе данных'
              : 'Демонстрационный режим лаборатории (сохранение локально)'}
          </p>
        </div>

        {errorMsg && <div className="auth-error-alert">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="auth-input-group">
              <label><User size={14} /> Имя студента</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <label><Mail size={14} /> Электронная почта</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="auth-input-group">
            <label><Lock size={14} /> Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {isSignUp && (
            <div className="auth-input-group">
              <label><ShieldCheck size={14} /> Роль в системе</label>
              <div className="role-selector-radios">
                <label className={role === 'student' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === 'student'}
                    onChange={() => setRole('student')}
                  />
                  Студент
                </label>
                <label className={role === 'teacher' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="role"
                    value="teacher"
                    checked={role === 'teacher'}
                    onChange={() => setRole('teacher')}
                  />
                  Куратор
                </label>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary auth-submit-btn">
            {loading ? 'Загрузка...' : isSignUp ? 'Зарегистрироваться' : 'Войти в личный кабинет'}
          </button>
        </form>

        <div className="auth-toggle-link">
          <button onClick={() => setIsSignUp(!isSignUp)} className="toggle-btn-link">
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Создать новый аккаунт студента'}
          </button>
        </div>

        {/* Quick Demo logins for testing ease */}
        {!isRealSupabaseConfigured && (
          <div className="demo-login-shortcuts">
            <div className="demo-divider"><span>Быстрый вход для тестов</span></div>
            <div className="demo-buttons">
              <button onClick={() => handleQuickDemoLogin('student')} className="btn btn-secondary demo-btn">
                Войти как Студент
              </button>
              <button onClick={() => handleQuickDemoLogin('teacher')} className="btn btn-secondary demo-btn">
                Войти как Куратор
              </button>
              <button onClick={() => handleQuickDemoLogin('admin')} className="btn btn-secondary demo-btn">
                Войти как Админ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

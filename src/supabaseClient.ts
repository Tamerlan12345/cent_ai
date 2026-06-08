// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isRealSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Real client (if configured)
const realSupabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock database helper for offline/demo mode
const getMockData = (key: string) => {
  const data = localStorage.getItem(`mock_db_${key}`);
  return data ? JSON.parse(data) : null;
};

const setMockData = (key: string, value: unknown) => {
  localStorage.setItem(`mock_db_${key}`, JSON.stringify(value));
};

// Initialize mock database seeds if empty
if (!getMockData('cohorts')) {
  setMockData('cohorts', [
    { id: 1, name: 'Весенняя когорта 2026', active_week: 1, created_at: new Date().toISOString() }
  ]);
}

if (!getMockData('profiles')) {
  setMockData('profiles', [
    { id: 'mock-teacher-id', email: 'teacher@cent.ai', password: 'password123', role: 'teacher', name: 'Куратор Лаборатории', cohort_id: 1 },
    { id: 'mock-student-id', email: 'student@cent.ai', password: 'password123', role: 'student', name: 'Иван Новичок', cohort_id: 1 },
    { id: 'mock-admin-id', email: 'admin', password: 'admin12345', role: 'admin', name: 'Администратор', cohort_id: 1 }
  ]);
}

if (!getMockData('homeworks')) {
  setMockData('homeworks', []);
}

interface SignUpParams {
  email: string;
  password?: string;
  options?: {
    data?: {
      role?: 'student' | 'teacher' | 'admin';
      name?: string;
    };
  };
}

interface SignInParams {
  email: string;
  password?: string;
}

interface MockProfile {
  id: string;
  email: string;
  password?: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  cohort_id: number;
}

// Mock Client emulation
const mockSupabase = {
  auth: {
    signUp: async ({ email, password, options }: SignUpParams) => {
      const profiles = (getMockData('profiles') || []) as MockProfile[];
      if (profiles.some((p) => p.email === email)) {
        return { data: { user: null }, error: { message: 'Пользователь с таким email уже зарегистрирован.' } };
      }
      const newId = `mock-user-${Math.random().toString(36).substring(2, 11)}`;
      const newUser: MockProfile = {
        id: newId,
        email,
        password: password,
        role: options?.data?.role || 'student',
        name: options?.data?.name || email.split('@')[0],
        cohort_id: 1
      };
      
      profiles.push(newUser);
      setMockData('profiles', profiles);

      // Save user session in localStorage to simulate auth persistent session
      localStorage.setItem('mock_session_user', JSON.stringify(newUser));

      return { data: { user: newUser, session: { access_token: 'mock-token' } }, error: null };
    },
    signInWithPassword: async ({ email, password }: SignInParams) => {
      const profiles = (getMockData('profiles') || []) as MockProfile[];
      const user = profiles.find((p) => p.email === email);
      if (!user) {
        return { data: { user: null }, error: { message: 'Неверный email или пользователь не существует.' } };
      }
      if (user.password && user.password !== password) {
        return { data: { user: null }, error: { message: 'Неверный пароль.' } };
      }
      localStorage.setItem('mock_session_user', JSON.stringify(user));
      return { data: { user, session: { access_token: 'mock-token' } }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('mock_session_user');
      return { error: null };
    },
    getUser: async () => {
      const user = localStorage.getItem('mock_session_user');
      return { data: { user: user ? (JSON.parse(user) as MockProfile) : null }, error: null };
    }
  },
  
  from: (table: string) => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      select: (_columns = '*') => {
        const list = (getMockData(table) || []) as Record<string, unknown>[];
        return {
          eq: (field: string, val: unknown) => {
            const filtered = list.filter((item) => item[field] === val);
            return {
              single: async () => ({ data: filtered[0] || null, error: null }),
              data: filtered,
              error: null,
              then: (cb: (res: { data: Record<string, unknown>[]; error: null }) => void) => cb({ data: filtered, error: null })
            };
          },
          data: list,
          error: null,
          then: (cb: (res: { data: Record<string, unknown>[]; error: null }) => void) => cb({ data: list, error: null })
        };
      },
      insert: (values: Record<string, unknown> | Record<string, unknown>[]) => {
        const list = (getMockData(table) || []) as Record<string, unknown>[];
        const records = Array.isArray(values) ? values : [values];
        const newRecords = records.map(r => ({
          id: Math.random().toString(36).substring(2, 11),
          ...r,
          created_at: new Date().toISOString()
        }));
        list.push(...newRecords);
        setMockData(table, list);
        return {
          select: () => ({
            single: async () => ({ data: newRecords[0], error: null }),
            data: newRecords,
            error: null
          }),
          data: newRecords,
          error: null,
          then: (cb: (res: { data: Record<string, unknown>[]; error: null }) => void) => cb({ data: newRecords, error: null })
        };
      },
      update: (values: Record<string, unknown>) => {
        return {
          eq: (field: string, val: unknown) => {
            let list = (getMockData(table) || []) as Record<string, unknown>[];
            list = list.map((item) => {
              if (item[field] === val) {
                return { ...item, ...values };
              }
              return item;
            });
            setMockData(table, list);
            return {
              data: list,
              error: null,
              then: (cb: (res: { data: Record<string, unknown>[]; error: null }) => void) => cb({ data: list, error: null })
            };
          }
        };
      }
    };
  },
  
  functions: {
    invoke: async (
      functionName: string,
      options?: {
        body?: {
          code_html?: string;
          code_css?: string;
          code_js?: string;
          week_title?: string;
          dod_criteria?: string[];
        };
      }
    ) => {
      if (functionName === 'review-homework' && options?.body) {
        const { code_html, code_css, code_js, week_title } = options.body;
        
        // Simulating artificial feedback from Gemini for offline testing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const totalCodeLength = (code_html?.length || 0) + (code_css?.length || 0) + (code_js?.length || 0);
        let score = 70;
        const comments: string[] = [];
        
        if (totalCodeLength > 100) score += 10;
        if (code_css && code_css.includes('var(--')) score += 10;
        else comments.push("Не использованы глобальные CSS-переменные для стилизации.");
        
        if (code_html && code_html.includes('aria-')) score += 5;
        
        if (score >= 90) {
          comments.unshift("Замечательная реализация! Все критерии DoD соблюдены.");
        } else {
          comments.unshift("Код рабочий, но требует косметических правок.");
        }
        
        const parsedResponse = {
          score: Math.min(score, 100),
          comments: comments,
          review_text: `### Отчет о ревью ИИ (Gemini Simulator)\n\nРабота по теме **${week_title || ''}** проверена.\n\n- **Качество разметки**: Отличное, использована семантика.\n- **Оценка стилей**: Хорошо, но убедитесь, что вы проверили работу на мобильном разрешении.\n- **Рекомендация**: Рекомендуется разбить длинные JS функции на более мелкие.`
        };
        
        return { data: parsedResponse, error: null };
      }
      return { data: null, error: { message: 'Функция не найдена' } };
    }
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = realSupabase || (mockSupabase as any);

// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isRealSupabaseConfigured = !!(
  supabaseAnonKey &&
  (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'))
);

const realSupabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ─── Mock localStorage DB ───────────────────────────────────────────────────
const getMockData = (key: string): Record<string, unknown>[] => {
  try {
    return JSON.parse(localStorage.getItem(`mock_db_${key}`) || 'null') ?? [];
  } catch {
    return [];
  }
};

const setMockData = (key: string, value: unknown) => {
  localStorage.setItem(`mock_db_${key}`, JSON.stringify(value));
};

// ─── Seed initial data ───────────────────────────────────────────────────────
if (!getMockData('cohorts').length) {
  setMockData('cohorts', [
    { id: 1, name: 'Весенняя когорта 2026', active_week: 1, created_at: new Date().toISOString() },
  ]);
}

if (!getMockData('profiles').length) {
  setMockData('profiles', [
    {
      id: 'mock-teacher-id',
      email: 'teacher@cent.ai',
      password: 'password123',
      role: 'teacher',
      name: 'Куратор Лаборатории',
      cohort_id: 1,
    },
    {
      id: 'mock-student-id',
      email: 'student@cent.ai',
      password: 'password123',
      role: 'student',
      name: 'Иван Новичок',
      cohort_id: 1,
    },
    {
      id: 'mock-admin-id',
      email: 'admin@cic.kz',
      password: 'admin12345',
      role: 'admin',
      name: 'Администратор',
      cohort_id: 1,
    },
  ]);
}

if (!getMockData('submissions').length) {
  setMockData('submissions', []);
}

if (!getMockData('progress').length) {
  setMockData('progress', []);
}

if (!getMockData('tour_events').length) {
  setMockData('tour_events', []);
}

// ─── Query builder ───────────────────────────────────────────────────────────
type FilterOp = 'eq' | 'in';
interface Filter {
  field: string;
  op: FilterOp;
  val: unknown;
}

type RowData = Record<string, unknown>;

interface QueryResult {
  data: RowData[] | RowData | null;
  error: null;
}

type ThenCb = (res: { data: RowData[] | null; error: null }) => void;

function createSelectBuilder(table: string) {
  const filters: Filter[] = [];
  let _orderField: string | null = null;

  const applyFilters = (): RowData[] => {
    let rows = getMockData(table);
    for (const f of filters) {
      if (f.op === 'eq') rows = rows.filter((r) => r[f.field] === f.val);
      if (f.op === 'in') rows = rows.filter((r) => (f.val as unknown[]).includes(r[f.field]));
    }
    if (_orderField) {
      const fld = _orderField;
      rows = [...rows].sort((a, b) => {
        const av = a[fld];
        const bv = b[fld];
        return typeof av === 'number' && typeof bv === 'number' ? av - bv : 0;
      });
    }
    return rows;
  };

  const builder = {
    eq(field: string, val: unknown) {
      filters.push({ field, op: 'eq', val });
      return builder;
    },
    in(field: string, vals: unknown[]) {
      filters.push({ field, op: 'in', val: vals });
      return builder;
    },
    order(field: string) {
      _orderField = field;
      return builder;
    },
    async single(): Promise<QueryResult> {
      const rows = applyFilters();
      return { data: rows[0] ?? null, error: null };
    },
    async maybeSingle(): Promise<QueryResult> {
      const rows = applyFilters();
      return { data: rows[0] ?? null, error: null };
    },
    then(cb: ThenCb) {
      return Promise.resolve().then(() => cb({ data: applyFilters(), error: null }));
    },
    get data() {
      return applyFilters();
    },
    error: null as null,
  };
  return builder;
}

// ─── Auth types ──────────────────────────────────────────────────────────────
interface SignUpParams {
  email: string;
  password?: string;
  options?: { data?: { role?: 'student' | 'teacher' | 'admin'; name?: string } };
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

// ─── Mock Supabase client ────────────────────────────────────────────────────
const mockSupabase = {
  auth: {
    signUp: async ({ email, password, options }: SignUpParams) => {
      const profiles = getMockData('profiles') as unknown as MockProfile[];
      if (profiles.some((p) => p.email === email)) {
        return {
          data: { user: null },
          error: { message: 'Пользователь с таким email уже зарегистрирован.' },
        };
      }
      const newUser: MockProfile = {
        id: `mock-user-${Math.random().toString(36).substring(2, 11)}`,
        email,
        password,
        role: options?.data?.role || 'student',
        name: options?.data?.name || email.split('@')[0],
        cohort_id: 1,
      };
      profiles.push(newUser);
      setMockData('profiles', profiles);
      localStorage.setItem('mock_session_user', JSON.stringify(newUser));
      return { data: { user: newUser, session: { access_token: 'mock-token' } }, error: null };
    },

    signInWithPassword: async ({ email, password }: SignInParams) => {
      const profiles = getMockData('profiles') as unknown as MockProfile[];
      const user = profiles.find((p) => p.email === email);
      if (!user) {
        return {
          data: { user: null },
          error: { message: 'Неверный email или пользователь не существует.' },
        };
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
      const raw = localStorage.getItem('mock_session_user');
      return { data: { user: raw ? (JSON.parse(raw) as MockProfile) : null }, error: null };
    },
  },

  from: (table: string) => ({
    select: (_columns = '*') => createSelectBuilder(table),

    insert: (values: RowData | RowData[]) => {
      const list = getMockData(table);
      const records = (Array.isArray(values) ? values : [values]).map((r) => ({
        id: Math.random().toString(36).substring(2, 11),
        ...r,
        created_at: new Date().toISOString(),
      }));
      list.push(...records);
      setMockData(table, list);
      const result = { data: records[0], error: null as null };
      return {
        select: () => ({
          single: async () => result,
          data: records,
          error: null,
        }),
        ...result,
        then: (cb: (res: typeof result) => void) => Promise.resolve(cb(result)),
      };
    },

    upsert: (values: RowData | RowData[], opts?: { onConflict?: string }) => {
      const list = getMockData(table);
      const records = Array.isArray(values) ? values : [values];
      const conflictKey = opts?.onConflict;

      const updated: RowData[] = [];
      for (const rec of records) {
        let found = false;
        if (conflictKey) {
          const keys = conflictKey.split(',').map((k) => k.trim());
          for (let i = 0; i < list.length; i++) {
            if (keys.every((k) => list[i][k] === rec[k])) {
              list[i] = { ...list[i], ...rec, updated_at: new Date().toISOString() };
              updated.push(list[i]);
              found = true;
              break;
            }
          }
        }
        if (!found) {
          const newRec = { id: Math.random().toString(36).substring(2, 11), ...rec, created_at: new Date().toISOString() };
          list.push(newRec);
          updated.push(newRec);
        }
      }
      setMockData(table, list);
      const result = { data: updated, error: null as null };
      return {
        ...result,
        then: (cb: (res: typeof result) => void) => Promise.resolve(cb(result)),
      };
    },

    update: (values: RowData) => ({
      eq: (field: string, val: unknown) => {
        const list = getMockData(table).map((item) =>
          item[field] === val ? { ...item, ...values, updated_at: new Date().toISOString() } : item,
        );
        setMockData(table, list);
        const result = { data: list, error: null as null };
        return {
          ...result,
          then: (cb: (res: typeof result) => void) => Promise.resolve(cb(result)),
        };
      },
    }),

    delete: () => ({
      eq: (field: string, val: unknown) => {
        const list = getMockData(table).filter((item) => item[field] !== val);
        setMockData(table, list);
        return { data: list, error: null };
      },
    }),
  }),

  functions: {
    invoke: async (
      functionName: string,
      options?: { body?: Record<string, unknown> },
    ) => {
      // Mock ai-gateway responses for demo mode
      if (functionName === 'ai-gateway' && options?.body) {
        const { task } = options.body as { task?: string };
        await new Promise((r) => setTimeout(r, 800));

        if (task === 'lint_prompt') {
          return {
            data: { ok: true, issues: [], hints: ['Промпт выглядит достаточно конкретным.'] },
            error: null,
          };
        }
        if (task === 'grade_submission') {
          const score = Math.floor(Math.random() * 25) + 75;
          return {
            data: {
              score,
              status: score >= 80 ? 'approved' : 'rejected',
              criteria: [],
              review_text: `### Ревью (Demo Mode)\n\nОценка: **${score}/100**`,
              comments: ['Хорошая структура кода.', 'Рекомендуется добавить aria-label.'],
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }
      return { data: null, error: { message: 'Функция не найдена' } };
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = realSupabase || (mockSupabase as any);

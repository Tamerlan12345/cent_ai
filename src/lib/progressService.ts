// Прогресс студента. Источник истины — таблица progress в Supabase;
// localStorage остаётся как офлайн-фолбэк и демо-режим, поэтому
// существующие пользователи ничего не теряют.

import { supabase, isRealSupabaseConfigured } from '../supabaseClient';

const LS_WEEKS = 'centras_completed_weeks';
const LS_CHECKLIST = 'centras_checklist';
const COURSE_SLUG = 'vibe-coding-basics';

export interface ProgressSnapshot {
  completedWeeks: number[];
  checklist: Record<string, boolean>;
}

function readLocal(): ProgressSnapshot {
  let completedWeeks: number[] = [];
  let checklist: Record<string, boolean> = {};
  try {
    completedWeeks = JSON.parse(localStorage.getItem(LS_WEEKS) || '[]');
    checklist = JSON.parse(localStorage.getItem(LS_CHECKLIST) || '{}');
  } catch {
    /* повреждённый localStorage не должен ломать приложение */
  }
  return { completedWeeks, checklist };
}

function writeLocal(snapshot: ProgressSnapshot) {
  localStorage.setItem(LS_WEEKS, JSON.stringify(snapshot.completedWeeks));
  localStorage.setItem(LS_CHECKLIST, JSON.stringify(snapshot.checklist));
}

interface ProgressRow {
  week_id: number;
  status: string;
  checklist: Record<string, boolean> | null;
}

export async function loadProgress(userId: string | null): Promise<ProgressSnapshot> {
  if (!userId || !isRealSupabaseConfigured) return readLocal();

  try {
    const { data, error } = await supabase
      .from('progress')
      .select('week_id, status, checklist')
      .eq('user_id', userId)
      .eq('course_slug', COURSE_SLUG);

    if (error || !data) return readLocal();

    const rows = data as ProgressRow[];
    const completedWeeks = rows.filter((r) => r.status === 'completed').map((r) => r.week_id);
    const checklist: Record<string, boolean> = {};
    for (const row of rows) Object.assign(checklist, row.checklist || {});

    const snapshot = { completedWeeks, checklist };
    writeLocal(snapshot); // локальная копия для офлайна
    return snapshot;
  } catch {
    return readLocal();
  }
}

export async function saveWeekCompleted(
  userId: string | null,
  weekId: number,
  quizScore?: number,
): Promise<void> {
  const local = readLocal();
  if (!local.completedWeeks.includes(weekId)) {
    local.completedWeeks.push(weekId);
    writeLocal(local);
  }

  if (!userId || !isRealSupabaseConfigured) return;

  try {
    await supabase.from('progress').upsert(
      {
        user_id: userId,
        course_slug: COURSE_SLUG,
        week_id: weekId,
        status: 'completed',
        quiz_score: quizScore ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_slug,week_id' },
    );
  } catch (e) {
    console.warn('progressService: не удалось сохранить неделю в БД', e);
  }
}

export async function saveChecklistItem(
  userId: string | null,
  weekId: number,
  itemId: string,
  checked: boolean,
): Promise<void> {
  const local = readLocal();
  local.checklist[itemId] = checked;
  writeLocal(local);

  if (!userId || !isRealSupabaseConfigured) return;

  try {
    // Чек-лист недели храним в строке прогресса этой недели
    const weekItems: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(local.checklist)) {
      if (key.startsWith(`${weekId}-`)) weekItems[key] = value;
    }

    const { data } = await supabase
      .from('progress')
      .select('status')
      .eq('user_id', userId)
      .eq('course_slug', COURSE_SLUG)
      .eq('week_id', weekId)
      .maybeSingle();

    await supabase.from('progress').upsert(
      {
        user_id: userId,
        course_slug: COURSE_SLUG,
        week_id: weekId,
        status: (data as { status?: string } | null)?.status === 'completed' ? 'completed' : 'in_progress',
        checklist: weekItems,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_slug,week_id' },
    );
  } catch (e) {
    console.warn('progressService: не удалось сохранить чек-лист в БД', e);
  }
}

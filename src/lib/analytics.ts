// Аналитика тура и платформы. Анонимный ID живёт в localStorage,
// чтобы воронку тура было видно и до регистрации.

import { supabase, isRealSupabaseConfigured } from '../supabaseClient';

const ANON_KEY = 'centras_anon_id';

export function getAnonId(): string {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `anon-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function trackTourEvent(
  step: string,
  event: string,
  meta: Record<string, unknown> = {},
  userId?: string | null,
): void {
  const record = {
    anon_id: getAnonId(),
    user_id: userId ?? null,
    step,
    event,
    meta,
  };

  if (!isRealSupabaseConfigured) {
    console.debug('[tour-analytics]', record);
    return;
  }

  // fire-and-forget: аналитика никогда не блокирует UX
  void supabase
    .from('tour_events')
    .insert(record)
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.debug('[tour-analytics] insert failed:', error.message);
    });
}

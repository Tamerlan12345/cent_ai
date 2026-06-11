-- ============================================================
-- Centras CodeAI — Mission Artifacts & Security Patch
-- ============================================================

-- ---------- Защита ролей (P0 Security) ----------
-- Студенты не должны иметь возможности поменять свою роль через API (update на profiles).
-- Только admin может менять роли.
create or replace function public.prevent_role_update()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Разрешаем менять роль, если вызывающий сам является админом
  if new.role is distinct from old.role then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Смена роли запрещена. Обратитесь к администратору.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_update on public.profiles;
create trigger on_profile_role_update
  before update on public.profiles
  for each row execute function public.prevent_role_update();

-- ---------- Артефакты миссий (LearningArtifact) ----------
create table if not exists public.learning_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null,
  week_id int not null,
  html text not null,
  css text not null,
  js text not null,
  score int not null default 0,
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create index if not exists idx_learning_artifacts_user on public.learning_artifacts(user_id);

alter table public.learning_artifacts enable row level security;

drop policy if exists "learning_artifacts_select" on public.learning_artifacts;
create policy "learning_artifacts_select" on public.learning_artifacts
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists "learning_artifacts_insert" on public.learning_artifacts;
create policy "learning_artifacts_insert" on public.learning_artifacts
  for insert with check (user_id = auth.uid());

drop policy if exists "learning_artifacts_update" on public.learning_artifacts;
create policy "learning_artifacts_update" on public.learning_artifacts
  for update using (user_id = auth.uid());

-- =====================================================================
-- PlanZoo v2 upgrade
-- Run this ONCE in Supabase -> SQL Editor -> New query (after schema.sql).
-- Adds: "In review" status, project colors, and an activity feed.
-- =====================================================================

-- 1. Project colors
alter table public.projects add column if not exists color text not null default '#4f46e5';

-- 2. New "review" status
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check check (status in ('todo', 'in_progress', 'review', 'done'));

-- 3. Activity feed
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('created', 'moved', 'assigned', 'commented')),
  task_title text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists activity_project_idx on public.activity (project_id, created_at desc);

alter table public.activity enable row level security;

drop policy if exists "activity: members can read" on public.activity;
create policy "activity: members can read" on public.activity
  for select to authenticated
  using (public.is_member(project_id));

-- Rows are written only by the triggers below (security definer), never by the browser.

create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.activity (project_id, user_id, action, task_title)
    values (new.project_id, actor, 'created', new.title);
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activity (project_id, user_id, action, task_title, detail)
      values (new.project_id, actor, 'moved', new.title, new.status);
    elsif new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null then
      insert into public.activity (project_id, user_id, action, task_title, detail)
      values (new.project_id, actor, 'assigned', new.title, new.assignee_id::text);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_task_activity on public.tasks;
create trigger on_task_activity
  after insert or update on public.tasks
  for each row execute function public.log_task_activity();

create or replace function public.log_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  ttl text;
begin
  select project_id, title into pid, ttl from public.tasks where id = new.task_id;
  if pid is not null then
    insert into public.activity (project_id, user_id, action, task_title)
    values (pid, new.user_id, 'commented', ttl);
  end if;
  return new;
end;
$$;

drop trigger if exists on_comment_activity on public.comments;
create trigger on_comment_activity
  after insert on public.comments
  for each row execute function public.log_comment_activity();

-- 4. Realtime for the activity feed (ignore the error if it is already added)
do $$
begin
  alter publication supabase_realtime add table public.activity;
exception when duplicate_object then
  null;
end $$;

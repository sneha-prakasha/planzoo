-- =====================================================================
-- TaskFlow database schema
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  position double precision not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index tasks_project_status_pos_idx on public.tasks (project_id, status, position);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index comments_task_idx on public.comments (task_id, created_at);

-- ---------- Helper functions (security definer avoids RLS recursion) ----------

create or replace function public.is_member(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

create or replace function public.is_owner(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where id = pid and owner_id = auth.uid()
  );
$$;

-- ---------- Triggers ----------

-- Create a profile when someone signs up, and auto-join any projects they were invited to
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1))
  );

  insert into public.project_members (project_id, user_id, role)
  select project_id, new.id, 'member'
  from public.invites
  where lower(email) = lower(new.email)
  on conflict do nothing;

  delete from public.invites where lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The creator of a project becomes its owner-member automatically
create or replace function public.add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.add_owner_as_member();

-- ---------- Invite RPC: add an existing user, or remember an invite for a new one ----------

create or replace function public.add_member_by_email(p_project_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.projects where id = p_project_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the project owner can invite people';
  end if;

  select id into uid from public.profiles where lower(email) = lower(trim(p_email));

  if uid is not null then
    insert into public.project_members (project_id, user_id, role)
    values (p_project_id, uid, 'member')
    on conflict do nothing;
    return 'added';
  else
    insert into public.invites (project_id, email, invited_by)
    values (p_project_id, lower(trim(p_email)), auth.uid())
    on conflict do nothing;
    return 'invited';
  end if;
end;
$$;

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invites enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;

-- profiles: you can see yourself and people who share a project with you
create policy "profiles: self and teammates" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.project_members pm
      where pm.user_id = profiles.id and public.is_member(pm.project_id)
    )
  );

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- projects
create policy "projects: members can read" on public.projects
  for select to authenticated
  using (public.is_member(id) or owner_id = auth.uid());

create policy "projects: create as yourself" on public.projects
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "projects: owner can update" on public.projects
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "projects: owner can delete" on public.projects
  for delete to authenticated
  using (owner_id = auth.uid());

-- project_members (inserts only happen through triggers / the invite RPC)
create policy "members: members can read" on public.project_members
  for select to authenticated
  using (public.is_member(project_id));

create policy "members: owner removes, or you leave" on public.project_members
  for delete to authenticated
  using (role <> 'owner' and (user_id = auth.uid() or public.is_owner(project_id)));

-- invites
create policy "invites: owner can read" on public.invites
  for select to authenticated
  using (public.is_owner(project_id));

create policy "invites: owner can delete" on public.invites
  for delete to authenticated
  using (public.is_owner(project_id));

-- tasks
create policy "tasks: members can read" on public.tasks
  for select to authenticated
  using (public.is_member(project_id));

create policy "tasks: members can create" on public.tasks
  for insert to authenticated
  with check (public.is_member(project_id) and created_by = auth.uid());

create policy "tasks: members can update" on public.tasks
  for update to authenticated
  using (public.is_member(project_id))
  with check (public.is_member(project_id));

create policy "tasks: members can delete" on public.tasks
  for delete to authenticated
  using (public.is_member(project_id));

-- comments (visible only if you can see the task)
create policy "comments: members can read" on public.comments
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = comments.task_id));

create policy "comments: members can write" on public.comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = comments.task_id)
  );

create policy "comments: delete your own" on public.comments
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------- Realtime (live board updates) ----------
-- If this errors with "already member of publication", you can ignore it.
alter publication supabase_realtime add table public.tasks;

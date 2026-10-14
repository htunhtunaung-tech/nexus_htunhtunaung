-- ===== Status values =====
create type public.project_status as enum ('planning', 'active', 'paused', 'completed');
create type public.task_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- ===== Projects =====
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 2000),
  status public.project_status not null default 'planning',
  color text not null default '#22d3ee' check (color ~ '^#[0-9a-fA-F]{6}$'),
  deadline date,
  position_x real not null default 0,
  position_y real not null default 0,
  position_z real not null default 0,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index projects_workspace_id_idx on public.projects(workspace_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ===== Tasks =====
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  due_date date,
  position double precision not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_status_idx on public.tasks(project_id, status);
create index tasks_assignee_id_idx on public.tasks(assignee_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Record when a task was finished (used by analytics)
create or replace function public.set_task_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_completed_at
  before insert or update on public.tasks
  for each row execute function public.set_task_completed_at();

-- ===== Milestones =====
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index milestones_project_id_idx on public.milestones(project_id);

-- ===== Activity log =====
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid default auth.uid() references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 1 and 50),
  entity_type text not null check (entity_type in ('workspace', 'project', 'task', 'milestone', 'member')),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_workspace_created_idx on public.activity_logs(workspace_id, created_at desc);

-- ===== Helpers =====
create or replace function public.project_workspace(p uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select workspace_id from public.projects where id = p;
$$;

create or replace function public.is_user_in_workspace(ws uuid, uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = uid
  );
$$;

-- ===== Row Level Security =====
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.milestones enable row level security;
alter table public.activity_logs enable row level security;

-- Projects: members see, create and edit; only owners/admins delete
create policy "projects_select" on public.projects for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "projects_insert" on public.projects for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "projects_update" on public.projects for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "projects_delete" on public.projects for delete to authenticated
  using (public.has_workspace_role(workspace_id, '{owner,admin}'));

-- Tasks: members see, create and edit; assignees must be workspace members;
-- the creator or an owner/admin can delete
create policy "tasks_select" on public.tasks for select to authenticated
  using (public.is_workspace_member(public.project_workspace(project_id)));
create policy "tasks_insert" on public.tasks for insert to authenticated
  with check (
    public.is_workspace_member(public.project_workspace(project_id))
    and created_by = (select auth.uid())
    and (assignee_id is null or public.is_user_in_workspace(public.project_workspace(project_id), assignee_id))
  );
create policy "tasks_update" on public.tasks for update to authenticated
  using (public.is_workspace_member(public.project_workspace(project_id)))
  with check (
    public.is_workspace_member(public.project_workspace(project_id))
    and (assignee_id is null or public.is_user_in_workspace(public.project_workspace(project_id), assignee_id))
  );
create policy "tasks_delete" on public.tasks for delete to authenticated
  using (
    created_by = (select auth.uid())
    or public.has_workspace_role(public.project_workspace(project_id), '{owner,admin}')
  );

-- Milestones: members see, create and edit; only owners/admins delete
create policy "milestones_select" on public.milestones for select to authenticated
  using (public.is_workspace_member(public.project_workspace(project_id)));
create policy "milestones_insert" on public.milestones for insert to authenticated
  with check (public.is_workspace_member(public.project_workspace(project_id)));
create policy "milestones_update" on public.milestones for update to authenticated
  using (public.is_workspace_member(public.project_workspace(project_id)))
  with check (public.is_workspace_member(public.project_workspace(project_id)));
create policy "milestones_delete" on public.milestones for delete to authenticated
  using (public.has_workspace_role(public.project_workspace(project_id), '{owner,admin}'));

-- Activity: members read; members add entries as themselves; nobody
-- ===== Roles =====
create type public.workspace_role as enum ('owner', 'admin', 'member');

-- ===== Shared helper: auto-update updated_at =====
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== Profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Workspaces =====
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ===== Workspace members =====
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members(user_id);

-- The creator of a workspace automatically becomes its owner
create or replace function public.handle_new_workspace()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- ===== Permission helpers (used by the security rules below) =====
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(ws uuid, roles public.workspace_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role = any(roles)
  );
$$;

create or replace function public.shares_workspace_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them on them.workspace_id = me.workspace_id
    where me.user_id = (select auth.uid()) and them.user_id = other
  );
$$;

-- ===== Row Level Security =====
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- Profiles: see yourself and your teammates; edit only yourself
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Workspaces: members can see; anyone signed in can create their own;
-- owners/admins can rename; only the owner can delete
create policy "workspaces_select" on public.workspaces for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_workspace_member(id));
create policy "workspaces_insert" on public.workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "workspaces_update" on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, '{owner,admin}'))
  with check (public.has_workspace_role(id, '{owner,admin}'));
create policy "workspaces_delete" on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Members: members see each other; owners/admins add and remove members
-- (never another owner); only the owner changes roles; anyone can leave
create policy "members_select" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "members_insert" on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, '{owner,admin}') and role <> 'owner');
create policy "members_update" on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, '{owner}') and role <> 'owner')
  with check (role <> 'owner');
create policy "members_delete" on public.workspace_members for delete to authenticated
  using (
    role <> 'owner' and (
      user_id = (select auth.uid())
      or public.has_workspace_role(workspace_id, '{owner,admin}')
    )
  );

-- ===== Explicit access (logged-out visitors get nothing) =====
revoke all on public.profiles, public.workspaces, public.workspace_members from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
-- ===== Invitations =====
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null
);

create index invitations_workspace_id_idx on public.invitations(workspace_id);

-- Only one open invite per email per workspace
create unique index invitations_open_email_idx
  on public.invitations(workspace_id, lower(email))
  where accepted_at is null;

-- ===== Security rules =====
alter table public.invitations enable row level security;

create policy "invitations_select" on public.invitations for select to authenticated
  using (public.has_workspace_role(workspace_id, '{owner,admin}'));

create policy "invitations_insert" on public.invitations for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, '{owner,admin}')
    and invited_by = (select auth.uid())
    and role <> 'owner'
    and accepted_at is null
  );

create policy "invitations_delete" on public.invitations for delete to authenticated
  using (public.has_workspace_role(workspace_id, '{owner,admin}'));

revoke all on public.invitations from anon;
grant select, insert, delete on public.invitations to authenticated;

-- ===== Preview an invite (for the accept page, before joining) =====
create or replace function public.get_invitation(invite_token text)
returns table (workspace_name text, email text, role public.workspace_role, expired boolean, used boolean)
language sql stable security definer set search_path = '' as $$
  select w.name, i.email, i.role, i.expires_at < now(), i.accepted_at is not null
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = invite_token;
$$;

-- ===== Accept an invite safely, all in one step =====
create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations;
  uid uuid := auth.uid();
  user_email text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into inv from public.invitations where token = invite_token for update;
  if not found then
    raise exception 'invalid_invitation';
  end if;
  if inv.accepted_at is not null then
    raise exception 'already_used';
  end if;
  if inv.expires_at < now() then
    raise exception 'expired';
  end if;

  select u.email into user_email from auth.users u where u.id = uid;
  if lower(user_email) <> lower(inv.email) then
    raise exception 'email_mismatch';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, uid, inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now(), accepted_by = uid
  where id = inv.id;

  insert into public.activity_logs (workspace_id, actor_id, action, entity_type, entity_id, metadata)
  values (inv.workspace_id, uid, 'joined', 'member', uid, jsonb_build_object('role', inv.role));

  return inv.workspace_id;
end;
$$;

-- Logged-in users can preview and accept; logged-out visitors can't call these
revoke execute on function public.get_invitation(text) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.get_invitation(text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
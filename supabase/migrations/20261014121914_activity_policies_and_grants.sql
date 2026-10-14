-- Activity: members read; members add entries as themselves; nobody edits or deletes
create policy "activity_select" on public.activity_logs for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "activity_insert" on public.activity_logs for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and actor_id = (select auth.uid()));

-- Explicit access
revoke all on public.projects, public.tasks, public.milestones, public.activity_logs from anon;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert on public.activity_logs to authenticated;
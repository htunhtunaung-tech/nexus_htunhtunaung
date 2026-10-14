-- Trigger functions: only the database runs these, never the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_workspace() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_task_completed_at() from public, anon, authenticated;

-- Permission helpers: logged-out visitors can't call them.
-- Logged-in users keep access, because the security rules (RLS) need them.
revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
revoke execute on function public.shares_workspace_with(uuid) from public, anon;
revoke execute on function public.project_workspace(uuid) from public, anon;
revoke execute on function public.is_user_in_workspace(uuid, uuid) from public, anon;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;
grant execute on function public.project_workspace(uuid) to authenticated;
grant execute on function public.is_user_in_workspace(uuid, uuid) to authenticated;
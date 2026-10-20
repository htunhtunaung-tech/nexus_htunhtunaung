import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  project_id: string;
};

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS limits everything below to workspaces this user belongs to
  const [{ data: profile }, { data: workspaces }, { data: projectRows }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase
      .from("workspaces")
      .select("id, name, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("projects")
      .select("id, name, color, status, workspace_id")
      .is("archived_at", null)
      .limit(500),
  ]);

  const projects = projectRows ?? [];
  const { data: taskRows } =
    projects.length > 0
      ? await supabase
          .from("tasks")
          .select("id, title, status, due_date, completed_at, project_id")
          .in(
            "project_id",
            projects.map((p) => p.id)
          )
          .limit(5000)
      : { data: [] };

  const tasks = (taskRows ?? []) as TaskRow[];
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const openTasks = tasks.filter((t) => t.status !== "done");
  const stats = [
    { label: "Active projects", value: projects.filter((p) => p.status === "active").length },
    { label: "Open tasks", value: openTasks.length },
    { label: "Overdue", value: openTasks.filter((t) => t.due_date !== null && t.due_date < today).length },
    { label: "Done this week", value: tasks.filter((t) => t.completed_at !== null && t.completed_at >= weekAgo).length },
  ];

  const upcoming = openTasks
    .filter((t) => t.due_date !== null && t.due_date >= today)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 5);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const projectCount = new Map<string, number>();
  for (const p of projects) projectCount.set(p.workspace_id, (projectCount.get(p.workspace_id) ?? 0) + 1);

  return (
    <div className="grid gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {profile?.display_name ?? user.email}</h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s where your work stands today.</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="upcoming-heading" className="grid gap-3">
        <h2 id="upcoming-heading" className="text-lg font-medium">
          Upcoming deadlines
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks with a due date. You&apos;re all caught up.</p>
        ) : (
          <ul className="grid gap-2">
            {upcoming.map((t) => {
              const project = projectById.get(t.project_id);
              return (
                <li key={t.id}>
                  <Link
                    href={`/projects/${t.project_id}/tasks`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className="size-2 rounded-full"
                          style={{ backgroundColor: project?.color }}
                        />
                        {project?.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t.due_date === today ? "Due today" : `Due ${t.due_date}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="workspaces-heading" className="grid gap-3">
        <h2 id="workspaces-heading" className="text-lg font-medium">
          Your workspaces
        </h2>
        {workspaces && workspaces.length > 0 ? (
          workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspace/${ws.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{ws.name}</CardTitle>
                  <CardDescription>
                    {ws.owner_id === user.id ? "Owner" : "Member"} · {projectCount.get(ws.id) ?? 0}{" "}
                    {(projectCount.get(ws.id) ?? 0) === 1 ? "project" : "projects"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No workspaces yet. Create your first one below.</p>
        )}
      </section>

      <CreateWorkspaceForm />
    </div>
  );
}
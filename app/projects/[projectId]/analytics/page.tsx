import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completedPerDay, summarize, workloadByAssignee, type AnalyticsTask } from "@/lib/analytics";
import { CompletedChart, WorkloadChart } from "@/components/analytics/charts";

type Props = { params: Promise<{ projectId: string }> };

export default function AnalyticsPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <AnalyticsContent params={params} />
      </Suspense>
    </main>
  );
}

async function AnalyticsContent({ params }: Props) {
  await connection();
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns nothing for projects outside this user's workspaces
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, color, workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: taskRows }, { data: memberRows }, { data: milestoneRows }] = await Promise.all([
    supabase
      .from("tasks")
      .select("status, due_date, completed_at, assignee_id")
      .eq("project_id", project.id)
      .limit(5000),
    supabase
      .from("workspace_members")
      .select("user_id, profiles(display_name)")
      .eq("workspace_id", project.workspace_id)
      .limit(200),
    supabase
      .from("milestones")
      .select("id, title, due_date")
      .eq("project_id", project.id)
      .is("completed_at", null)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  const tasks = (taskRows ?? []) as AnalyticsTask[];

  const names = new Map<string, string>();
  for (const m of memberRows ?? []) {
    const joined = m.profiles as unknown as
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null;
    const profile = Array.isArray(joined) ? joined[0] ?? null : joined;
    names.set(m.user_id, profile?.display_name ?? "Unnamed member");
  }

  const stats = summarize(tasks, today);
  const perDay = completedPerDay(tasks, today, 14);
  const workload = workloadByAssignee(tasks, names);
  const milestones = milestoneRows ?? [];

  const tiles = [
    { label: "Completion rate", value: `${stats.completionRate}%` },
    { label: "Open tasks", value: stats.open },
    { label: "Completed", value: stats.done },
    { label: "Overdue", value: stats.overdue },
  ];

  return (
    <div className="grid gap-8">
      <header>
        <Link href={`/projects/${project.id}`} className="text-sm text-muted-foreground hover:underline">
          ← Project overview
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name} analytics
        </h1>
        <p className="mt-1 text-muted-foreground">
          {stats.total} {stats.total === 1 ? "task" : "tasks"} in this project
        </p>
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold">{t.value}</p>
          </div>
        ))}
      </section>

      {stats.total === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          No tasks yet.{" "}
          <Link href={`/projects/${project.id}/tasks`} className="text-cyan-400 hover:underline">
            Add some on the task board
          </Link>{" "}
          to see charts here.
        </p>
      ) : (
        <>
          <section aria-labelledby="completed-heading" className="grid gap-3 rounded-xl border p-4">
            <h2 id="completed-heading" className="font-medium">
              Tasks completed · last 14 days
            </h2>
            <CompletedChart data={perDay} />
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Show data table</summary>
              <table className="mt-2 w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 font-medium">Date</th>
                    <th scope="col" className="py-1 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {perDay.map((d) => (
                    <tr key={d.date} className="border-t">
                      <td className="py-1">{d.label}</td>
                      <td className="py-1">{d.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          <section aria-labelledby="workload-heading" className="grid gap-3 rounded-xl border p-4">
            <h2 id="workload-heading" className="font-medium">
              Open tasks by person
            </h2>
            {workload.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every task is done.</p>
            ) : (
              <>
                <WorkloadChart data={workload} />
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Show data table</summary>
                  <table className="mt-2 w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-1 font-medium">Person</th>
                        <th scope="col" className="py-1 font-medium">Open tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workload.map((w) => (
                        <tr key={w.name} className="border-t">
                          <td className="py-1">{w.name}</td>
                          <td className="py-1">{w.open}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="milestones-heading" className="grid gap-3 rounded-xl border p-4">
        <h2 id="milestones-heading" className="font-medium">
          Upcoming milestones
        </h2>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming milestones with a due date.</p>
        ) : (
          <ul className="grid gap-2">
            {milestones.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 text-sm">
                <span>{m.title}</span>
                <span className="text-muted-foreground">Due {m.due_date}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="method-heading" className="grid gap-2 text-xs text-muted-foreground">
        <h2 id="method-heading" className="text-sm font-medium text-foreground">
          How these numbers are calculated
        </h2>
        <p><strong className="text-foreground">Completion rate</strong>: tasks in Done ÷ all tasks, rounded.</p>
        <p><strong className="text-foreground">Open</strong>: every task not in Done.</p>
        <p><strong className="text-foreground">Overdue</strong>: open tasks whose due date is before today.</p>
        <p><strong className="text-foreground">Completed per day</strong>: tasks counted on the day they moved to Done (UTC dates).</p>
        <p><strong className="text-foreground">Open tasks by person</strong>: open tasks grouped by assignee, including unassigned ones.</p>
      </section>
    </div>
  );
}
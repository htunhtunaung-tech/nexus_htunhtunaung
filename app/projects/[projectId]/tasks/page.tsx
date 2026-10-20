import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "./actions";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { KanbanBoard, type BoardTask } from "@/components/tasks/kanban-board";
import { MembersProvider, type Member } from "@/components/tasks/members-context";
import { RealtimeTasks } from "@/components/tasks/realtime-tasks";

type Props = { params: Promise<{ projectId: string }> };

export default function TasksPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <TasksContent params={params} />
      </Suspense>
    </main>
  );
}

async function TasksContent({ params }: Props) {
  await connection();
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, color, workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { data } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, assignee_id")
    .eq("project_id", project.id)
    .order("position", { ascending: true })
    .limit(500);

  // Workspace members, for the assignee dropdowns
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("user_id, profiles(display_name)")
    .eq("workspace_id", project.workspace_id)
    .limit(200);

  const members: Member[] = (memberRows ?? []).map((m) => {
    const joined = m.profiles as unknown as
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null;
    const profile = Array.isArray(joined) ? joined[0] ?? null : joined;
    return { id: m.user_id, name: profile?.display_name ?? "Unnamed member" };
  });

  const tasks = (data ?? []) as BoardTask[];
  const today = new Date().toISOString().slice(0, 10);

  // When the saved data changes, this key changes and the board reloads it
  const boardKey = tasks
    .map((t) => `${t.id}:${t.status}:${t.title}:${t.priority}:${t.due_date}:${t.description}:${t.assignee_id}`)
    .join("|");

  return (
    <div className="grid gap-8">
      <header>
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Project overview
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name}
        </h1>
        <p className="mt-1 text-muted-foreground">Drag cards between columns</p>
        <RealtimeTasks projectId={project.id} taskIds={tasks.map((t) => t.id)} />
      </header>

      <CreateTaskForm action={createTask.bind(null, project.id)} />

      <MembersProvider members={members}>
        <KanbanBoard key={boardKey} initialTasks={tasks} today={today} />
      </MembersProvider>
    </div>
  );
}
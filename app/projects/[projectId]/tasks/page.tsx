import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "./actions";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { KanbanBoard, type BoardTask } from "@/components/tasks/kanban-board";

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
    .select("id, title, description, status, priority, due_date")
    .eq("project_id", project.id)
    .order("position", { ascending: true })
    .limit(500);

  const tasks = (data ?? []) as BoardTask[];
  const today = new Date().toISOString().slice(0, 10);

  // When the saved data changes, this key changes and the board reloads it
  const boardKey = tasks.map((t) => `${t.id}:${t.status}:${t.title}:${t.priority}:${t.due_date}:${t.description}`).join("|");

  return (
    <div className="grid gap-8">
      <header>
        <Link
          href={`/workspace/${project.workspace_id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Workspace
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} · Drag cards between columns
        </p>
      </header>

      <CreateTaskForm action={createTask.bind(null, project.id)} />

      <KanbanBoard key={boardKey} initialTasks={tasks} today={today} />
    </div>
  );
}
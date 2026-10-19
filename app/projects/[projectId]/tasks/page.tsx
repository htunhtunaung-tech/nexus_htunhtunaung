import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "./actions";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";

type Props = { params: Promise<{ projectId: string }> };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-sky-400",
  high: "text-amber-400",
  urgent: "text-red-400",
};

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

  const tasks = (data ?? []) as Task[];
  const today = new Date().toISOString().slice(0, 10);

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
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </p>
      </header>

      <CreateTaskForm action={createTask.bind(null, project.id)} />

      <section
        aria-label="Task board"
        className="grid auto-cols-[minmax(200px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4"
      >
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="flex min-h-40 flex-col gap-3 rounded-xl border bg-muted/30 p-3">
              <h2 className="flex items-center justify-between text-sm font-medium">
                {STATUS_LABELS[status]}
                <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">
                  {columnTasks.length}
                </span>
              </h2>

              {columnTasks.length === 0 && (
                <p className="text-xs text-muted-foreground">No tasks</p>
              )}

              {columnTasks.map((task) => {
                const overdue = task.due_date !== null && task.due_date < today && task.status !== "done";
                return (
                  <article key={task.id} className="grid gap-2 rounded-lg border bg-background p-3">
                    <h3 className="text-sm font-medium">{task.title}</h3>
                    {task.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className={PRIORITY_STYLES[task.priority]}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                      {task.due_date && (
                        <span className={overdue ? "font-medium text-red-400" : "text-muted-foreground"}>
                          {overdue ? "Overdue · " : "Due "}
                          {task.due_date}
                        </span>
                      )}
                    </div>
                    <TaskStatusSelect taskId={task.id} status={task.status} />
                  </article>
                );
              })}
            </div>
          );
        })}
      </section>
    </div>
  );
}
import { connection } from "next/server";
import { Suspense } from "react"; import { PageSkeleton } from "@/components/page-skeleton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProject } from "./actions";
import { EditProjectForm } from "@/components/projects/edit-project-form";
import { ArchiveProjectButton } from "@/components/projects/archive-project-button";
import { Milestones, type Milestone } from "@/components/projects/milestones";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ projectId: string }> };

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export default function ProjectPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<PageSkeleton />}>
        <ProjectContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProjectContent({ params }: Props) {
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
    .select("id, name, description, status, color, deadline, workspace_id, archived_at")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const [{ data: taskRows }, { data: milestoneRows }] = await Promise.all([
    supabase.from("tasks").select("status, due_date").eq("project_id", project.id).limit(1000),
    supabase
      .from("milestones")
      .select("id, title, description, due_date, completed_at")
      .eq("project_id", project.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100),
  ]);

  const tasks = taskRows ?? [];
  const milestones = (milestoneRows ?? []) as Milestone[];
  const today = new Date().toISOString().slice(0, 10);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const open = total - done;
  const overdue = tasks.filter((t) => t.status !== "done" && t.due_date && t.due_date < today).length;
  // Progress = finished tasks out of all tasks
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  const stats = [
    { label: "Progress", value: `${progress}%` },
    { label: "Open tasks", value: open },
    { label: "Done", value: done },
    { label: "Overdue", value: overdue },
  ];

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <Link
          href={`/workspace/${project.workspace_id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Workspace
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name}
        </h1>
        <p className="text-muted-foreground">
          {STATUS_LABELS[project.status] ?? project.status}
          {project.deadline ? ` · Deadline ${project.deadline}` : ""}
        </p>
        {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
      </header>

      {project.archived_at && (
        <p role="status" className="rounded-lg border border-amber-400/40 p-3 text-sm text-amber-400">
          This project is archived.
        </p>
      )}

      <section aria-label="Project stats" className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
        <div
          role="progressbar"
          aria-label="Project progress"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress}%` }} />
        </div>
        <Link href={"/projects/" + project.id + "/analytics"} className="text-sm text-cyan-400 hover:underline">View analytics →</Link>
        <Button asChild className="justify-self-start">
          <Link href={`/projects/${project.id}/tasks`}>Open task board</Link>
        </Button>
      </section>

      <Milestones
        projectId={project.id}
        milestones={milestones}
        today={today}
        readOnly={project.archived_at !== null}
      />

      {!project.archived_at && (
        <>
          <EditProjectForm project={project} action={updateProject.bind(null, project.id)} />
          <ArchiveProjectButton projectId={project.id} />
        </>
      )}
    </div>
  );
}
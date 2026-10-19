import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "./actions";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Constellation } from "@/components/constellation/constellation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ workspaceId: string }> };

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export default function WorkspacePage({ params }: Props) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <WorkspaceContent params={params} />
      </Suspense>
    </main>
  );
}

async function WorkspaceContent({ params }: Props) {
  await connection();
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns nothing if this user isn't a member, so outsiders get a 404
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspace) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, color, position_x, position_y, position_z")
    .eq("workspace_id", workspace.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="grid gap-8">
      <header>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{workspace.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {projects?.length ?? 0} {projects?.length === 1 ? "project" : "projects"}
        </p>
      </header>

      <Constellation projects={projects ?? []} />

      <CreateProjectForm action={createProject.bind(null, workspace.id)} />

      <section className="grid gap-3 sm:grid-cols-2">
        {projects && projects.length > 0 ? (
          projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </CardTitle>
                  <CardDescription>
                    {STATUS_LABELS[project.status] ?? project.status}
                    {project.description ? ` · ${project.description}` : ""}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            No projects yet. Create your first one above.
          </p>
        )}
      </section>
    </div>
  );
}
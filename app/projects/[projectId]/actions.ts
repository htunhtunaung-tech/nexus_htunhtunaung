"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProjectEditState = { error?: string; success?: boolean } | undefined;

const editSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a project name").max(100, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional(),
  status: z.enum(["planning", "active", "paused", "completed"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color"),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
    .optional(),
});

export async function updateProject(
  projectId: string,
  _prev: ProjectEditState,
  formData: FormData
): Promise<ProjectEditState> {
  const parsed = editSchema.safeParse({
    projectId,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    color: formData.get("color"),
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  const { name, description, status, color, deadline } = parsed.data;

  // RLS only allows edits by members of the project's workspace
  const { data: project, error } = await supabase
    .from("projects")
    .update({ name, description: description ?? null, status, color, deadline: deadline ?? null })
    .eq("id", parsed.data.projectId)
    .is("archived_at", null)
    .select("id, workspace_id")
    .maybeSingle();

  if (error || !project) return { error: "Couldn't save the project. Try again." };

  await supabase.from("activity_logs").insert({
    workspace_id: project.workspace_id,
    actor_id: user.id,
    action: "updated",
    entity_type: "project",
    entity_id: project.id,
    metadata: { name },
  });

  revalidatePath(`/projects/${project.id}`);
  revalidatePath(`/workspace/${project.workspace_id}`);
  return { success: true };
}

export async function archiveProject(projectId: string): Promise<{ error?: string }> {
  const parsed = z.string().uuid().safeParse(projectId);
  if (!parsed.success) return { error: "Invalid project." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  // Archiving hides the project but keeps its data
  const { data: project, error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("archived_at", null)
    .select("id, name, workspace_id")
    .maybeSingle();

  if (error || !project) return { error: "Couldn't archive the project. Try again." };

  await supabase.from("activity_logs").insert({
    workspace_id: project.workspace_id,
    actor_id: user.id,
    action: "archived",
    entity_type: "project",
    entity_id: project.id,
    metadata: { name: project.name },
  });

  revalidatePath(`/workspace/${project.workspace_id}`);
  redirect(`/workspace/${project.workspace_id}`);
}
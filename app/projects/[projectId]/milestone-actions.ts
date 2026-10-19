"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type MilestoneState = { error?: string; success?: boolean } | undefined;

const milestoneSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, "Enter a milestone title").max(200, "Title is too long"),
  description: z.string().trim().max(2000, "Note is too long").optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
    .optional(),
});

export async function createMilestone(
  projectId: string,
  _prev: MilestoneState,
  formData: FormData
): Promise<MilestoneState> {
  const parsed = milestoneSchema.safeParse({
    projectId,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  // RLS only allows members of the project's workspace to add milestones
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", parsed.data.projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const { title, description, dueDate } = parsed.data;
  const { data: milestone, error } = await supabase
    .from("milestones")
    .insert({
      project_id: project.id,
      title,
      description: description ?? null,
      due_date: dueDate ?? null,
    })
    .select("id")
    .single();

  if (error || !milestone) return { error: "Couldn't add the milestone. Try again." };

  await supabase.from("activity_logs").insert({
    workspace_id: project.workspace_id,
    actor_id: user.id,
    action: "created",
    entity_type: "milestone",
    entity_id: milestone.id,
    metadata: { title },
  });

  revalidatePath(`/projects/${project.id}`);
  return { success: true };
}

export async function toggleMilestone(
  milestoneId: string,
  completed: boolean
): Promise<{ error?: string }> {
  const parsed = z.string().uuid().safeParse(milestoneId);
  if (!parsed.success) return { error: "Invalid milestone." };

  const supabase = await createClient();
  const { data: milestone, error } = await supabase
    .from("milestones")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", parsed.data)
    .select("id, project_id")
    .maybeSingle();

  if (error || !milestone) return { error: "Couldn't update the milestone. Try again." };

  revalidatePath(`/projects/${milestone.project_id}`);
  return {};
}

export async function deleteMilestone(milestoneId: string): Promise<{ error?: string }> {
  const parsed = z.string().uuid().safeParse(milestoneId);
  if (!parsed.success) return { error: "Invalid milestone." };

  const supabase = await createClient();

  // RLS only lets workspace owners and admins delete milestones
  const { data: deleted, error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", parsed.data)
    .select("id, project_id");

  if (error || !deleted || deleted.length === 0) {
    return { error: "Only workspace owners and admins can delete milestones." };
  }

  revalidatePath(`/projects/${deleted[0].project_id}`);
  return {};
}
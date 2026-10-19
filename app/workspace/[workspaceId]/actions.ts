"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProjectState = { error?: string; success?: boolean } | undefined;

const projectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a project name").max(100, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional(),
  status: z.enum(["planning", "active", "paused", "completed"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color"),
});

// A random spot in the 3D constellation, between -5 and 5
function randomPosition() {
  return Math.round((Math.random() * 10 - 5) * 100) / 100;
}

export async function createProject(
  workspaceId: string,
  _prev: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const parsed = projectSchema.safeParse({
    workspaceId,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  const { name, description, status, color } = parsed.data;

  // RLS checks that this user is a member of the workspace
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name,
      description: description ?? null,
      status,
      color,
      position_x: randomPosition(),
      position_y: randomPosition(),
      position_z: randomPosition(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !project) return { error: "Couldn't create the project. Try again." };

  await supabase.from("activity_logs").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: "created",
    entity_type: "project",
    entity_id: project.id,
    metadata: { name },
  });

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}
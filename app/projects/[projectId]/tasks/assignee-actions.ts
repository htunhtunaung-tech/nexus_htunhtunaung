"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  taskId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable(),
});

export async function updateTaskAssignee(
  taskId: string,
  assigneeId: string | null
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ taskId, assigneeId });
  if (!parsed.success) return { error: "Invalid assignee." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  // RLS only accepts assignees who are members of the task's workspace
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ assignee_id: parsed.data.assigneeId })
    .eq("id", parsed.data.taskId)
    .select("id, title, project_id")
    .maybeSingle();

  if (error || !task) return { error: "Couldn't change the assignee." };

  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", task.project_id)
    .maybeSingle();

  if (project) {
    await supabase.from("activity_logs").insert({
      workspace_id: project.workspace_id,
      actor_id: user.id,
      action: parsed.data.assigneeId ? "assigned" : "unassigned",
      entity_type: "task",
      entity_id: task.id,
      metadata: { title: task.title },
    });
  }

  revalidatePath(`/projects/${task.project_id}/tasks`);
  return {};
}
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks";

export type TaskState = { error?: string; success?: boolean } | undefined;

const taskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, "Enter a task title").max(200, "Title is too long"),
  description: z.string().trim().max(5000, "Description is too long").optional(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
    .optional(),
});

export async function createTask(
  projectId: string,
  _prev: TaskState,
  formData: FormData
): Promise<TaskState> {
  const parsed = taskSchema.safeParse({
    projectId,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  // RLS hides projects in workspaces this user isn't part of
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };

  const { title, description, priority, status, dueDate } = parsed.data;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id: project.id,
      title,
      description: description ?? null,
      priority,
      status,
      due_date: dueDate ?? null,
      position: Date.now(), // new tasks go to the bottom of their column
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) return { error: "Couldn't create the task. Try again." };

  await supabase.from("activity_logs").insert({
    workspace_id: project.workspace_id,
    actor_id: user.id,
    action: "created",
    entity_type: "task",
    entity_id: task.id,
    metadata: { title },
  });

  revalidatePath(`/projects/${project.id}/tasks`);
  return { success: true };
}

const statusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(TASK_STATUSES),
});

export async function updateTaskStatus(
  taskId: string,
  status: string
): Promise<{ error?: string }> {
  const parsed = statusSchema.safeParse({ taskId, status });
  if (!parsed.success) return { error: "Invalid status." };

  const supabase = await createClient();

  // RLS only allows updates by members of the task's workspace
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.taskId)
    .select("id, project_id")
    .maybeSingle();

  if (error || !task) return { error: "Couldn't move the task. Try again." };

  revalidatePath(`/projects/${task.project_id}/tasks`);
  return {};
}

const editSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1, "Enter a task title").max(200, "Title is too long"),
  description: z.string().trim().max(5000, "Description is too long").optional(),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
    .optional(),
});

export async function updateTask(
  taskId: string,
  _prev: TaskState,
  formData: FormData
): Promise<TaskState> {
  const parsed = editSchema.safeParse({
    taskId,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { title, description, priority, dueDate } = parsed.data;

  // RLS only allows edits by members of the task's workspace
  const { data: task, error } = await supabase
    .from("tasks")
    .update({
      title,
      description: description ?? null,
      priority,
      due_date: dueDate ?? null,
    })
    .eq("id", parsed.data.taskId)
    .select("id, project_id")
    .maybeSingle();

  if (error || !task) return { error: "Couldn't save the task. Try again." };

  revalidatePath(`/projects/${task.project_id}/tasks`);
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  const parsed = z.string().uuid().safeParse(taskId);
  if (!parsed.success) return { error: "Invalid task." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, project_id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!task) return { error: "Task not found." };

  // RLS only lets the task's creator or a workspace owner/admin delete it
  const { data: deleted, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", task.id)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    return { error: "Only the task's creator or a workspace owner or admin can delete it." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", task.project_id)
    .maybeSingle();

  if (project) {
    await supabase.from("activity_logs").insert({
      workspace_id: project.workspace_id,
      actor_id: user.id,
      action: "deleted",
      entity_type: "task",
      entity_id: task.id,
      metadata: { title: task.title },
    });
  }

  revalidatePath(`/projects/${task.project_id}/tasks`);
  return {};
}
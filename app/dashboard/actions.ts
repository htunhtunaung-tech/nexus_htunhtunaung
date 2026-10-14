"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceState = { error?: string; success?: boolean } | undefined;

const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name").max(80, "Name is too long"),
});

export async function createWorkspace(
  _prev: WorkspaceState,
  formData: FormData
): Promise<WorkspaceState> {
  const parsed = workspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  // RLS checks that owner_id matches the logged-in user
  const { error } = await supabase
    .from("workspaces")
    .insert({ name: parsed.data.name, owner_id: user.id });

  if (error) return { error: "Couldn't create the workspace. Try again." };

  revalidatePath("/dashboard");
  return { success: true };
}
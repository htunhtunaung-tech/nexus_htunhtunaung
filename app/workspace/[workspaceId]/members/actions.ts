"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { error?: string; success?: boolean } | undefined;

const inviteSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  role: z.enum(["admin", "member"]),
});

export async function createInvitation(
  workspaceId: string,
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({
    workspaceId,
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Log in again." };

  const { email, role } = parsed.data;
  if (email === user.email?.toLowerCase()) return { error: "You're already in this workspace." };

  // RLS only lets owners and admins create invites
  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({ workspace_id: workspaceId, email, role, invited_by: user.id })
    .select("id")
    .single();

  if (error || !invite) {
    if (error?.code === "23505") return { error: "That email already has an open invite." };
    return { error: "Couldn't create the invite. Only owners and admins can invite people." };
  }

  await supabase.from("activity_logs").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: "invited",
    entity_type: "member",
    entity_id: invite.id,
    metadata: { role },
  });

  revalidatePath(`/workspace/${workspaceId}/members`);
  return { success: true };
}

export async function revokeInvitation(invitationId: string): Promise<{ error?: string }> {
  const parsed = z.string().uuid().safeParse(invitationId);
  if (!parsed.success) return { error: "Invalid invite." };

  const supabase = await createClient();

  // RLS only lets owners and admins revoke invites
  const { data: deleted, error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", parsed.data)
    .select("workspace_id");

  if (error || !deleted || deleted.length === 0) return { error: "Couldn't revoke the invite." };

  revalidatePath(`/workspace/${deleted[0].workspace_id}/members`);
  return {};
}
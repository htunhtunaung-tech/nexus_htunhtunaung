"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  not_authenticated: "Log in first, then open the link again.",
  invalid_invitation: "This invite link isn't valid.",
  already_used: "This invite has already been used.",
  expired: "This invite has expired. Ask for a new one.",
  email_mismatch: "This invite was sent to a different email. Log in with that account.",
};

export async function acceptInvite(token: string): Promise<{ error?: string }> {
  const parsed = z.string().regex(/^[a-f0-9]{48}$/).safeParse(token);
  if (!parsed.success) return { error: ERRORS.invalid_invitation };

  const supabase = await createClient();

  // The database checks everything and adds the member in one safe step
  const { data: workspaceId, error } = await supabase.rpc("accept_invitation", {
    invite_token: parsed.data,
  });

  if (error || !workspaceId) {
    const code = Object.keys(ERRORS).find((key) => error?.message?.includes(key));
    return { error: code ? ERRORS[code] : "Couldn't accept the invite. Try again." };
  }

  redirect(`/workspace/${workspaceId}`);
}
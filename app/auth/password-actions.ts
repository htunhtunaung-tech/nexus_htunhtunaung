"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type PasswordState = { error?: string; message?: string } | undefined;

export async function requestPasswordReset(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = z.string().trim().email("Enter a valid email address").safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: origin + "/auth/confirm?next=/reset-password",
  });

  if (error?.status === 429) return { error: "Too many emails were sent. Try again in an hour." };

  // Same message whether or not the account exists, so the form can't be used to find accounts
  return { message: "If an account exists for that email, a reset link is on its way. Check your inbox." };
}

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "The passwords don't match" });

export async function updatePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Couldn't update your password. Try a different one." };

  redirect("/dashboard");
}
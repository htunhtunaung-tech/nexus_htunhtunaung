"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const coord = z.number().min(-10).max(10);
const positionSchema = z.object({ projectId: z.string().uuid(), x: coord, y: coord, z: coord });

const round = (v: number) => Math.round(v * 100) / 100;

// Save one planet's new spot after it is dragged
export async function updateProjectPosition(
  projectId: string,
  x: number,
  y: number,
  z: number
): Promise<{ error?: string }> {
  const parsed = positionSchema.safeParse({ projectId, x, y, z });
  if (!parsed.success) return { error: "Invalid position." };

  const supabase = await createClient();

  // RLS only allows members of the project's workspace to move it
  const { data, error } = await supabase
    .from("projects")
    .update({ position_x: round(x), position_y: round(y), position_z: round(z) })
    .eq("id", parsed.data.projectId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save the new position." };
  return {};
}

// Spread all planets evenly over a sphere (a "golden spiral")
export async function resetLayout(workspaceId: string): Promise<{ error?: string }> {
  const parsed = z.string().uuid().safeParse(workspaceId);
  if (!parsed.success) return { error: "Invalid workspace." };

  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", parsed.data)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error || !projects) return { error: "Couldn't reset the layout." };

  const n = projects.length;
  const radius = 5;
  const golden = Math.PI * (3 - Math.sqrt(5));

  const results = await Promise.all(
    projects.map((p, i) => {
      const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      return supabase
        .from("projects")
        .update({
          position_x: round(Math.cos(theta) * r * radius),
          position_y: round(y * radius),
          position_z: round(Math.sin(theta) * r * radius),
        })
        .eq("id", p.id);
    })
  );

  if (results.some((r) => r.error)) return { error: "Couldn't reset every project. Try again." };

  revalidatePath(`/workspace/${parsed.data}`);
  return {};
}
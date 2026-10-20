import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Load the app's Supabase settings and the test accounts' passwords
for (const file of [".env.local", ".env.test.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // The file is optional; the tests skip themselves if settings are missing
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const memberEmail = process.env.TEST_MEMBER_EMAIL;
const memberPassword = process.env.TEST_MEMBER_PASSWORD;
const outsiderEmail = process.env.TEST_OUTSIDER_EMAIL;
const outsiderPassword = process.env.TEST_OUTSIDER_PASSWORD;

const configured = Boolean(url && key && memberEmail && memberPassword && outsiderEmail && outsiderPassword);

function newClient() {
  return createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(email: string, password: string) {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Couldn't sign in as ${email}: ${error.message}`);
  return client;
}

describe.skipIf(!configured)("database security (RLS)", () => {
  let owner: SupabaseClient;
  let outsider: SupabaseClient;
  let workspaceId = "";

  // Make a temporary workspace that only the owner belongs to
  beforeAll(async () => {
    owner = await signIn(memberEmail!, memberPassword!);
    outsider = await signIn(outsiderEmail!, outsiderPassword!);
    const {
      data: { user },
    } = await owner.auth.getUser();
    const { data, error } = await owner
      .from("workspaces")
      .insert({ name: "RLS test workspace", owner_id: user!.id })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Setup failed: ${error?.message}`);
    workspaceId = data.id;
  }, 30_000);

  // Clean up afterwards
  afterAll(async () => {
    if (workspaceId) await owner.from("workspaces").delete().eq("id", workspaceId);
  });

  it("lets the owner read their workspace", async () => {
    const { data } = await owner.from("workspaces").select("id").eq("id", workspaceId);
    expect(data).toHaveLength(1);
  });

  it("hides the workspace from an outsider", async () => {
    const { data } = await outsider.from("workspaces").select("id").eq("id", workspaceId);
    expect(data ?? []).toHaveLength(0);
  });

  it("stops an outsider from renaming it", async () => {
    const { data } = await outsider
      .from("workspaces")
      .update({ name: "Hacked" })
      .eq("id", workspaceId)
      .select("id");
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await owner.from("workspaces").select("name").eq("id", workspaceId).single();
    expect(check?.name).toBe("RLS test workspace");
  });

  it("stops an outsider from deleting it", async () => {
    await outsider.from("workspaces").delete().eq("id", workspaceId);
    const { data } = await owner.from("workspaces").select("id").eq("id", workspaceId);
    expect(data).toHaveLength(1);
  });

  it("stops an outsider from adding a project", async () => {
    const { error } = await outsider.from("projects").insert({ workspace_id: workspaceId, name: "Sneaky project" });
    expect(error).not.toBeNull();
  });

  it("stops an outsider from adding themselves as a member", async () => {
    const {
      data: { user },
    } = await outsider.auth.getUser();
    const { error } = await outsider
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: user!.id, role: "member" });
    expect(error).not.toBeNull();
  });

  it("hides the workspace's invites from an outsider", async () => {
    const { data } = await outsider.from("invitations").select("id").eq("workspace_id", workspaceId);
    expect(data ?? []).toHaveLength(0);
  });

  it("shows nothing to logged-out visitors", async () => {
    const { data, error } = await newClient().from("workspaces").select("id").limit(1);
    // Visitors get either an error or an empty list, never real data
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});
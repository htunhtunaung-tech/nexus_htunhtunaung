import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // RLS returns only workspaces this user belongs to
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="grid gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome, {profile?.display_name ?? user.email}
          </h1>
          <p className="mt-1 text-muted-foreground">Signed in as {user.email}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Log out
          </Button>
        </form>
      </header>

      <CreateWorkspaceForm />

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Your workspaces</h2>
        {workspaces && workspaces.length > 0 ? (
          workspaces.map((ws) => (
            <Card key={ws.id}>
              <CardHeader>
                <CardTitle>{ws.name}</CardTitle>
                <CardDescription>
                  {ws.owner_id === user.id ? "Owner" : "Member"} · Created{" "}
                  {new Date(ws.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No workspaces yet. Create your first one above.
          </p>
        )}
      </section>
    </div>
  );
}
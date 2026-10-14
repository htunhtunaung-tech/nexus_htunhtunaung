import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

// Reads the logged-in user, so it renders per request inside Suspense
async function Welcome() {
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

  return (
    <>
      <h1 className="text-2xl font-semibold">
        Welcome, {profile?.display_name ?? user.email}
      </h1>
      <p className="mt-2 text-muted-foreground">You&apos;re signed in as {user.email}.</p>
      <form action={logout} className="mt-6">
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </>
  );
}
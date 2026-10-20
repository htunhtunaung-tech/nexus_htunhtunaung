import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createInvitation } from "./actions";
import { InviteForm } from "@/components/members/invite-form";
import { PendingInvite } from "@/components/members/pending-invite";

type Props = { params: Promise<{ workspaceId: string }> };

const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };
const ROLE_STYLES: Record<string, string> = {
  owner: "border-cyan-400/50 text-cyan-300",
  admin: "border-violet-400/50 text-violet-300",
  member: "border-border text-muted-foreground",
};

export default function MembersPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <MembersContent params={params} />
      </Suspense>
    </main>
  );
}

async function MembersContent({ params }: Props) {
  await connection();
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns nothing if this user isn't a member, so outsiders get a 404
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspace) notFound();

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at, profiles(display_name)")
    .eq("workspace_id", workspace.id)
    .order("joined_at", { ascending: true })
    .limit(200);

  const members = memberRows ?? [];
  const myRole = members.find((m) => m.user_id === user.id)?.role ?? "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const { data: inviteRows } = canManage
    ? await supabase
        .from("invitations")
        .select("id, email, role, token, expires_at")
        .eq("workspace_id", workspace.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const invites = inviteRows ?? [];
  const now = new Date().toISOString();

  return (
    <div className="grid gap-8">
      <header>
        <Link href={`/workspace/${workspace.id}`} className="text-sm text-muted-foreground hover:underline">
          ← {workspace.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Members</h1>
        <p className="mt-1 text-muted-foreground">
          {members.length} {members.length === 1 ? "person" : "people"} · You&apos;re{" "}
          {myRole === "admin" ? "an" : "the"} {ROLE_LABELS[myRole]?.toLowerCase()}
          {myRole === "member" ? " role" : ""}
        </p>
      </header>

      <section aria-label="Workspace members" className="grid gap-2">
        <ul className="grid gap-2">
          {members.map((m) => {
            const joined = m.profiles as unknown as { display_name: string | null } | { display_name: string | null }[] | null;
            const profile = Array.isArray(joined) ? joined[0] ?? null : joined;            
            return (
              <li key={m.user_id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
                  >
                    {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {profile?.display_name ?? "Unnamed member"}
                      {m.user_id === user.id && <span className="text-muted-foreground"> (you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${ROLE_STYLES[m.role] ?? ""}`}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {canManage ? (
        <>
          <InviteForm action={createInvitation.bind(null, workspace.id)} />

          <section aria-labelledby="pending-heading" className="grid gap-3">
            <h2 id="pending-heading" className="text-lg font-medium">
              Pending invites
            </h2>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open invites.</p>
            ) : (
              <ul className="grid gap-2">
                {invites.map((i) => (
                  <PendingInvite
                    key={i.id}
                    id={i.id}
                    email={i.email}
                    role={i.role}
                    token={i.token}
                    expiresAt={i.expires_at}
                    expired={i.expires_at < now}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Only owners and admins can invite people to this workspace.
        </p>
      )}
    </div>
  );
}
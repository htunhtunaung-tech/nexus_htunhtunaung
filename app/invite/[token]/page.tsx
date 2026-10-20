import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "@/components/members/accept-invite-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ token: string }> };

type Invite = {
  workspace_name: string;
  email: string;
  role: string;
  expired: boolean;
  used: boolean;
};

export default function InvitePage({ params }: Props) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <InviteContent params={params} />
      </Suspense>
    </main>
  );
}

async function InviteContent({ params }: Props) {
  await connection();
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Log in first, then come back to this invite
  if (!user) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);

  const { data } = await supabase.rpc("get_invitation", { invite_token: token });
  const invite = (Array.isArray(data) ? data[0] : null) as Invite | null;

  let problem: string | null = null;
  if (!invite) problem = "This invite link isn't valid.";
  else if (invite.used) problem = "This invite has already been used.";
  else if (invite.expired) problem = "This invite has expired. Ask for a new one.";
  else if (invite.email.toLowerCase() !== user.email?.toLowerCase())
    problem = `This invite was sent to ${invite.email}. You're logged in as ${user.email}.`;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{problem ? "Invite unavailable" : "You're invited"}</CardTitle>
        <CardDescription>
          {problem ?? (
            <>
              Join <span className="font-medium text-foreground">{invite!.workspace_name}</span> as{" "}
              {invite!.role === "admin" ? "an admin" : "a member"}.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {problem ? (
          <Link href="/dashboard" className="text-sm text-cyan-400 hover:underline">
            Go to your dashboard
          </Link>
        ) : (
          <AcceptInviteButton token={token} />
        )}
      </CardContent>
    </Card>
  );
}
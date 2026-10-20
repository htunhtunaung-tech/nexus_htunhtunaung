"use client";

import { useActionState, useEffect, useRef } from "react";
import type { InviteState } from "@/app/workspace/[workspaceId]/members/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  action: (prev: InviteState, formData: FormData) => Promise<InviteState>;
};

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function InviteForm({ action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, undefined);

  // Empty the form after an invite is created
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 rounded-xl border p-4">
      <div>
        <h2 className="text-lg font-medium">Invite someone</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ll get a link to send them yourself. It works once and expires in 7 days.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" placeholder="teammate@example.com" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-role">Role</Label>
          <select id="invite-role" name="role" defaultValue="member" className={fieldClass}>
            <option value="member" className="bg-background">Member</option>
            <option value="admin" className="bg-background">Admin</option>
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invite"}
        </Button>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-emerald-400">
          Invite created. Copy the link below and send it to them.
        </p>
      )}
    </form>
  );
}
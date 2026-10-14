"use client";

import { useActionState } from "react";
import { createWorkspace } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspace, undefined);

  return (
    <form action={formAction} className="grid gap-2">
      <Label htmlFor="workspace-name">New workspace</Label>
      <div className="flex gap-2">
        <Input id="workspace-name" name="name" placeholder="Louis's lab" maxLength={80} required />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
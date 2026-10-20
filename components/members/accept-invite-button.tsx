"use client";

import { useState, useTransition } from "react";
import { acceptInvite } from "@/app/invite/[token]/actions";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      // On success the server sends you into the workspace
      const result = await acceptInvite(token);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-2">
      <Button type="button" disabled={pending} onClick={handleAccept}>
        {pending ? "Joining…" : "Join workspace"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
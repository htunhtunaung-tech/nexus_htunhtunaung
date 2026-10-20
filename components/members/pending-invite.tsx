"use client";

import { useState, useTransition } from "react";
import { revokeInvitation } from "@/app/workspace/[workspaceId]/members/actions";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  expired: boolean;
};

export function PendingInvite({ id, email, role, token, expiresAt, expired }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Try again.");
    }
  }

  function revoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitation(id);
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  }

  return (
    <li className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{email}</p>
        <p className={`text-xs ${expired ? "text-red-400" : "text-muted-foreground"}`}>
          {role === "admin" ? "Admin" : "Member"} ·{" "}
          {expired ? "Expired" : `Expires ${new Date(expiresAt).toLocaleDateString()}`}
        </p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {!expired && (
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        )}
        {confirming ? (
          <>
            <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={revoke}>
              Revoke
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            {expired ? "Remove" : "Revoke"}
          </Button>
        )}
      </div>
    </li>
  );
}
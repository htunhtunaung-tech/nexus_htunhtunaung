"use client";

import { useState, useTransition } from "react";
import { archiveProject } from "@/app/projects/[projectId]/actions";
import { Button } from "@/components/ui/button";

export function ArchiveProjectButton({ projectId }: { projectId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      // On success the server sends you back to the workspace
      const result = await archiveProject(projectId);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="grid gap-3 rounded-xl border border-destructive/40 p-4">
      <div>
        <h2 className="text-lg font-medium">Archive project</h2>
        <p className="text-sm text-muted-foreground">
          Hides the project from the workspace. Its tasks and history are kept.
        </p>
      </div>
      {confirming ? (
        <div className="flex gap-2">
          <Button type="button" variant="destructive" disabled={pending} onClick={handleArchive}>
            {pending ? "Archiving…" : "Yes, archive"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="justify-self-start" onClick={() => setConfirming(true)}>
          Archive project
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
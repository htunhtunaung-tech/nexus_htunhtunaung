"use client";

import { useState, useTransition } from "react";
import { updateTaskAssignee } from "@/app/projects/[projectId]/tasks/assignee-actions";
import { useMembers } from "@/components/tasks/members-context";

export function AssigneeSelect({ taskId, assigneeId }: { taskId: string; assigneeId: string | null }) {
  const members = useMembers();
  const [value, setValue] = useState(assigneeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 grid gap-1">
      <select
        aria-label="Assignee"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const previous = value;
          const next = e.target.value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await updateTaskAssignee(taskId, next || null);
            if (result.error) {
              setValue(previous);
              setError(result.error);
            }
          });
        }}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs disabled:opacity-50"
      >
        <option value="" className="bg-background">
          Unassigned
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id} className="bg-background">
            {m.name}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
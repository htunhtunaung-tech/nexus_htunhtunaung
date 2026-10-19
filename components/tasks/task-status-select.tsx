"use client";

import { useState, useTransition } from "react";
import { updateTaskStatus } from "@/app/projects/[projectId]/tasks/actions";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/tasks";

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-1">
      <select
        aria-label="Move task to column"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as TaskStatus;
          setError(null);
          startTransition(async () => {
            const result = await updateTaskStatus(taskId, next);
            if (result.error) setError(result.error);
          });
        }}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs disabled:opacity-50"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-background">
            {STATUS_LABELS[s]}
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
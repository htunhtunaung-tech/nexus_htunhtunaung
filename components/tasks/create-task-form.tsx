"use client";

import { useActionState } from "react";
import type { TaskState } from "@/app/projects/[projectId]/tasks/actions";
import { PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  action: (prev: TaskState, formData: FormData) => Promise<TaskState>;
};

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CreateTaskForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid gap-4 rounded-xl border p-4">
      <h2 className="text-lg font-medium">New task</h2>

      <div className="grid gap-2">
        <Label htmlFor="task-title">Title</Label>
        <Input id="task-title" name="title" placeholder="Design the login page" maxLength={200} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="task-description">Description</Label>
        <textarea
          id="task-description"
          name="description"
          rows={2}
          maxLength={5000}
          className={`${fieldClass} h-auto py-2`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="task-status">Column</Label>
          <select id="task-status" name="status" defaultValue="todo" className={fieldClass}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-background">
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="task-priority">Priority</Label>
          <select id="task-priority" name="priority" defaultValue="medium" className={fieldClass}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p} className="bg-background">
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="task-due">Due date</Label>
          <input id="task-due" name="dueDate" type="date" className={fieldClass} />
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
}
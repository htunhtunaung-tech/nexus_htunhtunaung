"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  createMilestone,
  deleteMilestone,
  toggleMilestone,
  type MilestoneState,
} from "@/app/projects/[projectId]/milestone-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Milestone = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
};

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Milestones({
  projectId,
  milestones,
  today,
  readOnly,
}: {
  projectId: string;
  milestones: Milestone[];
  today: string;
  readOnly: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, adding] = useActionState<MilestoneState, FormData>(
    createMilestone.bind(null, projectId),
    undefined
  );
  const [pending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Empty the form after a milestone is added
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  const doneCount = milestones.filter((m) => m.completed_at).length;

  // Unfinished first, then by due date
  const sorted = [...milestones].sort((a, b) => {
    if (!!a.completed_at !== !!b.completed_at) return a.completed_at ? 1 : -1;
    return (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
  });

  function handleToggle(id: string, completed: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleMilestone(id, completed);
      if (result.error) setError(result.error);
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteMilestone(id);
      if (result.error) setError(result.error);
      setConfirmingId(null);
    });
  }

  return (
    <section aria-labelledby="milestones-heading" className="grid gap-4 rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="milestones-heading" className="text-lg font-medium">
          Milestones
        </h2>
        <p className="text-sm text-muted-foreground">
          {milestones.length === 0 ? "None yet" : `${doneCount} of ${milestones.length} done`}
        </p>
      </div>

      {sorted.length > 0 && (
        <ul className="grid gap-2">
          {sorted.map((m) => {
            const done = m.completed_at !== null;
            const overdue = !done && m.due_date !== null && m.due_date < today;
            return (
              <li key={m.id} className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
                <input
                  type="checkbox"
                  aria-label={`Mark "${m.title}" as ${done ? "not done" : "done"}`}
                  checked={done}
                  disabled={readOnly || pending}
                  onChange={(e) => handleToggle(m.id, e.target.checked)}
                  className="mt-1 size-4 cursor-pointer accent-cyan-400"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
                    {m.title}
                  </p>
                  {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  {m.due_date && (
                    <p className={`text-xs ${overdue ? "font-medium text-red-400" : "text-muted-foreground"}`}>
                      {overdue ? "Overdue · " : "Due "}
                      {m.due_date}
                    </p>
                  )}
                </div>
                {!readOnly &&
                  (confirmingId === m.id ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => handleDelete(m.id)}
                      >
                        Delete
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete milestone "${m.title}"`}
                      onClick={() => setConfirmingId(m.id)}
                    >
                      Remove
                    </Button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {!readOnly && (
        <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="milestone-title">New milestone</Label>
            <Input id="milestone-title" name="title" placeholder="MVP launched" maxLength={200} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="milestone-due">Due date</Label>
            <input id="milestone-due" name="dueDate" type="date" className={fieldClass} />
          </div>
          <Button type="submit" disabled={adding}>
            {adding ? "Adding…" : "Add"}
          </Button>
          <div className="grid gap-2 sm:col-span-3">
            <Label htmlFor="milestone-note">Note (optional)</Label>
            <Input id="milestone-note" name="description" maxLength={2000} placeholder="What counts as done" />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive sm:col-span-3">
              {state.error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
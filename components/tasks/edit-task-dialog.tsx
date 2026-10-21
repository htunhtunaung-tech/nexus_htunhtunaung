"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteTask, updateTask } from "@/app/projects/[projectId]/tasks/actions";
import type { BoardTask } from "@/components/tasks/kanban-board";
import { PRIORITY_LABELS, TASK_PRIORITIES } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EditTaskDialog({ task }: { task: BoardTask }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, saving] = useActionState(async (prev: Awaited<ReturnType<typeof updateTask>>, formData: FormData) => { const result = await updateTask(task.id, prev, formData); if (result?.success) setOpen(false); return result; }, undefined);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);


  function handleDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteTask(task.id);
      if (result.error) {
        setDeleteError(result.error);
        setConfirming(false);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    // Stop clicks and key presses inside the dialog from starting a card drag
    <div onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setConfirming(false);
          setDeleteError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Change the details, or delete the task.</DialogDescription>
          </DialogHeader>

          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`title-${task.id}`}>Title</Label>
              <Input id={`title-${task.id}`} name="title" defaultValue={task.title} maxLength={200} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`description-${task.id}`}>Description</Label>
              <textarea
                id={`description-${task.id}`}
                name="description"
                rows={3}
                maxLength={5000}
                defaultValue={task.description ?? ""}
                className={`${fieldClass} h-auto py-2`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`priority-${task.id}`}>Priority</Label>
                <select
                  id={`priority-${task.id}`}
                  name="priority"
                  defaultValue={task.priority}
                  className={fieldClass}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p} className="bg-background">
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`due-${task.id}`}>Due date</Label>
                <input
                  id={`due-${task.id}`}
                  name="dueDate"
                  type="date"
                  defaultValue={task.due_date ?? ""}
                  className={fieldClass}
                />
              </div>
            </div>

            {state?.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            {deleteError && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError}
              </p>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              {confirming ? (
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>
                  Delete task
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
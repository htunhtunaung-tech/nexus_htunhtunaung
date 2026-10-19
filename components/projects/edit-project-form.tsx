"use client";

import { useActionState } from "react";
import type { ProjectEditState } from "@/app/projects/[projectId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Project = {
  name: string;
  description: string | null;
  status: string;
  color: string;
  deadline: string | null;
};

type Props = {
  project: Project;
  action: (prev: ProjectEditState, formData: FormData) => Promise<ProjectEditState>;
};

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EditProjectForm({ project, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid gap-4 rounded-xl border p-4">
      <h2 className="text-lg font-medium">Project details</h2>

      <div className="grid gap-2">
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" name="name" defaultValue={project.name} maxLength={100} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="edit-description">Description</Label>
        <textarea
          id="edit-description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={project.description ?? ""}
          className={`${fieldClass} h-auto py-2`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="edit-status">Status</Label>
          <select id="edit-status" name="status" defaultValue={project.status} className={fieldClass}>
            <option value="planning" className="bg-background">Planning</option>
            <option value="active" className="bg-background">Active</option>
            <option value="paused" className="bg-background">Paused</option>
            <option value="completed" className="bg-background">Completed</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-color">Color</Label>
          <input
            id="edit-color"
            name="color"
            type="color"
            defaultValue={project.color}
            className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-deadline">Deadline</Label>
          <input
            id="edit-deadline"
            name="deadline"
            type="date"
            defaultValue={project.deadline ?? ""}
            className={fieldClass}
          />
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-emerald-400">
          Changes saved
        </p>
      )}

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
"use client";

import { useActionState } from "react";
import type { ProjectState } from "@/app/workspace/[workspaceId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 
import { ActionToast } from "@/components/ui/action-toast";

type Props = {
  action: (prev: ProjectState, formData: FormData) => Promise<ProjectState>;
};

const fieldClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CreateProjectForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid gap-4 rounded-xl border p-4">
      <h2 className="text-lg font-medium">New project</h2>
      <ActionToast state={state} success="Project created" />

      <div className="grid gap-2">
        <Label htmlFor="project-name">Name</Label>
        <Input id="project-name" name="name" placeholder="Portfolio website" maxLength={100} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project-description">Description</Label>
        <textarea
          id="project-description"
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="What this project is about"
          className={`${fieldClass} h-auto py-2`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="project-status">Status</Label>
          <select id="project-status" name="status" defaultValue="planning" className={fieldClass}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-color">Color</Label>
          <input
            id="project-color"
            name="color"
            type="color"
            defaultValue="#22d3ee"
            className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent"
          />
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
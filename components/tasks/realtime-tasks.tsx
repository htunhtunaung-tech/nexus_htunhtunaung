"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { projectId: string; taskIds: string[] };

// Listens for task changes and reloads the board when a teammate changes something
export function RealtimeTasks({ projectId, taskIds }: Props) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const known = useRef(new Set(taskIds));

  // Keep the list of this board's task ids up to date
  useEffect(() => {
    known.current = new Set(taskIds);
  }, [taskIds]);

  useEffect(() => {
    const supabase = createClient();

    // Wait a moment so several quick changes cause only one reload
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 300);
    };

    const filter = `project_id=eq.${projectId}`;
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks", filter }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks", filter }, refresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, (payload) => {
        // Delete events only include the id, so only react to this board's tasks
        const id = (payload.old as { id?: string }).id;
        if (id && known.current.has(id)) refresh();
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  return (
    <p aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${live ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
      />
      {live ? "Live" : "Connecting…"}
    </p>
  );
}
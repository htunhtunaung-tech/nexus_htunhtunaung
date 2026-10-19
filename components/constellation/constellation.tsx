"use client";

import dynamic from "next/dynamic";
import type { ConstellationProject } from "./constellation-scene";

const ConstellationScene = dynamic(() => import("./constellation-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading constellation…
    </div>
  ),
});

export function Constellation({ projects }: { projects: ConstellationProject[] }) {
  if (projects.length === 0) return null;

  return (
    <section aria-label="Project constellation" className="grid gap-2">
      <div className="h-[420px] overflow-hidden rounded-xl border bg-[#05070a]">
        <ConstellationScene projects={projects} />
      </div>
      <p className="text-xs text-muted-foreground">
        Drag to rotate · Scroll to zoom · Right-drag to pan
      </p>
    </section>
  );
}
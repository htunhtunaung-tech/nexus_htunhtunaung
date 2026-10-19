"use client";

import dynamic from "next/dynamic";
import type { ConstellationProject } from "./constellation-scene";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constellation";

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
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>Drag to rotate · Scroll to zoom · Right-drag to pan</p>
        <ul aria-label="Status colors" className="flex flex-wrap gap-4">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <li key={status} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full border-2"
                style={{ borderColor: STATUS_COLORS[status] }}
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
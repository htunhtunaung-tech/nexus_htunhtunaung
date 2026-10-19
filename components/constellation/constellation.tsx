"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ConstellationProject } from "./constellation-scene";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constellation";
import { Button } from "@/components/ui/button";

const ConstellationScene = dynamic(() => import("./constellation-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading constellation…
    </div>
  ),
});

function progressText(p: ConstellationProject) {
  if (p.taskCount === 0) return "No tasks yet";
  return `${p.progress}% · ${p.doneCount} of ${p.taskCount} tasks done`;
}

export function Constellation({ projects }: { projects: ConstellationProject[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hovered = projects.find((p) => p.id === hoveredId) ?? null;
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  // Close the side panel with Esc
  useEffect(() => {
    if (!selectedId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  if (projects.length === 0) return null;

  return (
    <section aria-label="Project constellation" className="grid gap-2">
      <div className="relative h-[420px] overflow-hidden rounded-xl border bg-[#05070a]">
        <ConstellationScene
          projects={projects}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={setSelectedId}
        />

        {/* Hover tooltip */}
        {hovered && hovered.id !== selectedId && (
          <div
            aria-live="polite"
            className="pointer-events-none absolute left-3 top-3 rounded-lg border bg-black/80 px-3 py-2 text-xs"
          >
            <p className="font-medium text-white">{hovered.name}</p>
            <p className="text-muted-foreground">
              <span style={{ color: STATUS_COLORS[hovered.status] }}>
                {STATUS_LABELS[hovered.status] ?? hovered.status}
              </span>
              {" · "}
              {progressText(hovered)}
            </p>
          </div>
        )}

        {/* Side panel for the clicked project */}
        {selected && (
          <aside
            aria-label={`${selected.name} details`}
            className="absolute inset-y-3 right-3 flex w-72 max-w-[calc(100%-1.5rem)] flex-col gap-4 overflow-y-auto rounded-xl border bg-background/95 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: selected.color }} />
                {selected.name}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Close details"
                onClick={() => setSelectedId(null)}
              >
                ×
              </Button>
            </div>

            <p className="text-sm" style={{ color: STATUS_COLORS[selected.status] }}>
              {STATUS_LABELS[selected.status] ?? selected.status}
            </p>

            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">{progressText(selected)}</p>
              <div
                role="progressbar"
                aria-label={`${selected.name} progress`}
                aria-valuenow={selected.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${selected.progress}%` }} />
              </div>
            </div>

            <div className="mt-auto grid gap-2">
              <Button asChild>
                <Link href={`/projects/${selected.id}`}>Open overview</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/projects/${selected.id}/tasks`}>Open task board</Link>
              </Button>
            </div>
          </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>Drag to rotate · Scroll to zoom · Right-drag to pan · Click a planet for details</p>
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
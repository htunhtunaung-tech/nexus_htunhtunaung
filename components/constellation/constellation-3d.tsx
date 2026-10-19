"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ConstellationProject } from "./constellation-scene";
import type { Vec3 } from "./project-node";
import { progressLabel } from "./project-grid";
import { SceneBoundary } from "./scene-boundary";
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

type Props = {
  projects: ConstellationProject[];
  sceneKey: string;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, position: Vec3) => void;
  onFallback: () => void;
};

export function Constellation3D({
  projects,
  sceneKey,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onMove,
  onFallback,
}: Props) {
  const hovered = projects.find((p) => p.id === hoveredId) ?? null;
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      <div className="relative h-[420px] overflow-hidden rounded-xl border bg-[#05070a]">
        <SceneBoundary
          key={sceneKey}
          fallback={
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <p>The 3D view couldn&apos;t start on this device.</p>
              <Button type="button" size="sm" variant="outline" onClick={onFallback}>
                Show grid view
              </Button>
            </div>
          }
        >
          <ConstellationScene
            key={sceneKey}
            projects={projects}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={onHover}
            onSelect={onSelect}
            onMove={onMove}
          />
        </SceneBoundary>

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
              {progressLabel(hovered)}
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
              <Button type="button" variant="ghost" size="sm" aria-label="Close details" onClick={() => onSelect(null)}>
                ×
              </Button>
            </div>
            <p className="text-sm" style={{ color: STATUS_COLORS[selected.status] }}>
              {STATUS_LABELS[selected.status] ?? selected.status}
            </p>
            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">{progressLabel(selected)}</p>
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
        <p>Drag a planet to move it · Drag the background to rotate · Scroll to zoom · Click for details</p>
        <ul aria-label="Status colors" className="flex flex-wrap gap-4">
          {Object.entries(STATUS_LABELS).map(([s, label]) => (
            <li key={s} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full border-2" style={{ borderColor: STATUS_COLORS[s] }} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
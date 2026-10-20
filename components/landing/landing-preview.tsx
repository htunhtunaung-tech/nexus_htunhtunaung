"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { ConstellationProject } from "@/components/constellation/constellation-scene";
import { SceneBoundary } from "@/components/constellation/scene-boundary";
import { hasWebGL } from "@/lib/webgl";

const ConstellationScene = dynamic(() => import("@/components/constellation/constellation-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading preview…</div>
  ),
});

// Clearly fake sample projects, only for this preview
const SAMPLE: ConstellationProject[] = [
  { id: "s1", name: "Mobile app", description: null, color: "#22d3ee", status: "active", position_x: -3, position_y: 1, position_z: 0, taskCount: 12, doneCount: 7, progress: 58 },
  { id: "s2", name: "API redesign", description: null, color: "#a78bfa", status: "planning", position_x: 2, position_y: 2.5, position_z: -1, taskCount: 6, doneCount: 1, progress: 17 },
  { id: "s3", name: "Docs site", description: null, color: "#34d399", status: "completed", position_x: 3, position_y: -1.5, position_z: 1, taskCount: 9, doneCount: 9, progress: 100 },
  { id: "s4", name: "Data pipeline", description: null, color: "#fbbf24", status: "paused", position_x: -1, position_y: -2.5, position_z: -2, taskCount: 8, doneCount: 3, progress: 38 },
  { id: "s5", name: "Design system", description: null, color: "#f472b6", status: "active", position_x: 0.5, position_y: 0.5, position_z: 2.5, taskCount: 10, doneCount: 6, progress: 60 },
];

const subscribeNever = () => () => {};

export function LandingPreview() {
  const webgl = useSyncExternalStore(subscribeNever, hasWebGL, () => true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fallback = (
    <ul className="grid h-full content-center gap-2 p-6 text-sm">
      {SAMPLE.map((p) => (
        <li key={p.id} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name} · {p.progress}%
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border bg-[#05070a] sm:h-[440px]">
      {webgl ? (
        <SceneBoundary fallback={fallback}>
          <ConstellationScene
            projects={SAMPLE}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={setHoveredId}
            onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
            onMove={() => {}}
          />
        </SceneBoundary>
      ) : (
        fallback
      )}
      <span className="pointer-events-none absolute left-3 top-3 rounded-full border bg-black/70 px-2.5 py-1 text-xs text-muted-foreground">
        Sample data · drag to explore
      </span>
    </div>
  );
}
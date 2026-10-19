"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ConstellationProject } from "./constellation-scene";
import type { Vec3 } from "./project-node";
import { ProjectGrid, progressLabel } from "./project-grid";
import { ProjectList } from "./project-list";
import { resetLayout, updateProjectPosition } from "@/app/workspace/[workspaceId]/position-actions";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constellation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ConstellationScene = dynamic(() => import("./constellation-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading constellation…
    </div>
  ),
});

type View = "3d" | "grid" | "list";
const VIEWS: { id: View; label: string }[] = [
  { id: "3d", label: "3D" },
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
];

const fieldClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Constellation({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: ConstellationProject[];
}) {
  const [view, setView] = useState<View>("3d");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [moved, setMoved] = useState<Record<string, Vec3>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [pending, startTransition] = useTransition();

  // Apply positions the user dragged in this visit
  const merged = projects.map((p) => {
    const m = moved[p.id];
    return m ? { ...p, position_x: m[0], position_y: m[1], position_z: m[2] } : p;
  });

  const search = query.trim().toLowerCase();
  const visible = merged.filter(
    (p) => (!search || p.name.toLowerCase().includes(search)) && (status === "all" || p.status === status)
  );
  const filtering = search !== "" || status !== "all";

  const hovered = visible.find((p) => p.id === hoveredId) ?? null;
  const selected = visible.find((p) => p.id === selectedId) ?? null;

  // Start the 3D scene fresh when saved positions or the filtered set change
  const sceneKey =
    projects.map((p) => `${p.id}:${p.position_x},${p.position_y},${p.position_z}`).join("|") +
    "#" +
    visible.map((p) => p.id).join(",");

  // Close the side panel with Esc
  useEffect(() => {
    if (!selectedId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  function handleMove(id: string, position: Vec3) {
    setMoved((current) => ({ ...current, [id]: position }));
    setMessage({ text: "Saving position…" });
    startTransition(async () => {
      const [x, y, z] = position;
      const result = await updateProjectPosition(id, x, y, z);
      setMessage(result.error ? { text: result.error, error: true } : { text: "Position saved" });
    });
  }

  function handleReset() {
    setConfirmingReset(false);
    setMessage({ text: "Resetting layout…" });
    startTransition(async () => {
      const result = await resetLayout(workspaceId);
      if (!result.error) setMoved({});
      setMessage(result.error ? { text: result.error, error: true } : { text: "Layout reset" });
    });
  }

  if (projects.length === 0) return null;

  return (
    <section aria-label="Projects" className="grid gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Search
          <Input
            type="search"
            placeholder="Search projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-52"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
            <option value="all" className="bg-background">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-background">
                {label}
              </option>
            ))}
          </select>
        </label>

        <div role="group" aria-label="View" className="ml-auto flex rounded-md border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              className={`rounded px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                view === v.id ? "bg-cyan-400/15 text-cyan-300" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {filtering ? `Showing ${visible.length} of ${projects.length} projects` : `${projects.length} projects`}
        </p>
        {message && view === "3d" && (
          <p role="status" className={`text-xs ${message.error ? "text-destructive" : "text-muted-foreground"}`}>
            · {message.text}
          </p>
        )}
        {view === "3d" && (
          <div className="ml-auto flex items-center gap-2">
            {confirmingReset ? (
              <>
                <span className="text-xs text-muted-foreground">Move every planet to an even layout?</span>
                <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={handleReset}>
                  Yes, reset
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingReset(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setConfirmingReset(true)}>
                Reset layout
              </Button>
            )}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          No projects match. Try another search or status.
        </p>
      ) : view === "grid" ? (
        <ProjectGrid projects={visible} />
      ) : view === "list" ? (
        <ProjectList projects={visible} />
      ) : (
        <>
          <div className="relative h-[420px] overflow-hidden rounded-xl border bg-[#05070a]">
            <ConstellationScene
              key={sceneKey}
              projects={visible}
              hoveredId={hoveredId}
              selectedId={selectedId}
              onHover={setHoveredId}
              onSelect={setSelectedId}
              onMove={handleMove}
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
                  <Button type="button" variant="ghost" size="sm" aria-label="Close details" onClick={() => setSelectedId(null)}>
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
      )}
    </section>
  );
}
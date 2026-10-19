"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import type { ConstellationProject } from "./constellation-scene";
import type { Vec3 } from "./project-node";
import { Constellation3D } from "./constellation-3d";
import { ProjectGrid } from "./project-grid";
import { ProjectList } from "./project-list";
import { resetLayout, updateProjectPosition } from "@/app/workspace/[workspaceId]/position-actions";
import { STATUS_LABELS } from "@/lib/constellation";
import { hasWebGL } from "@/lib/webgl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type View = "3d" | "grid" | "list";
const VIEWS: { id: View; label: string }[] = [
  { id: "3d", label: "3D" },
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
];

const fieldClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const subscribeNever = () => () => {};

export function Constellation({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: ConstellationProject[];
}) {
  const webgl = useSyncExternalStore(subscribeNever, hasWebGL, () => true);
  const [view, setView] = useState<View>("3d");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [moved, setMoved] = useState<Record<string, Vec3>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [pending, startTransition] = useTransition();

  // Without WebGL, 3D can't run, so show the grid instead
  const activeView: View = !webgl && view === "3d" ? "grid" : view;

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
          {VIEWS.map((v) => {
            const unavailable = v.id === "3d" && !webgl;
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={activeView === v.id}
                disabled={unavailable}
                title={unavailable ? "3D needs WebGL, which this browser doesn't support" : undefined}
                onClick={() => setView(v.id)}
                className={`rounded px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeView === v.id ? "bg-cyan-400/15 text-cyan-300" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {!webgl && (
        <p role="status" className="rounded-lg border border-amber-400/40 p-3 text-xs text-amber-400">
          This browser can&apos;t show 3D, so you&apos;re seeing the grid view. Everything else works the same.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {filtering ? `Showing ${visible.length} of ${projects.length} projects` : `${projects.length} projects`}
        </p>
        {message && activeView === "3d" && (
          <p role="status" className={`text-xs ${message.error ? "text-destructive" : "text-muted-foreground"}`}>
            · {message.text}
          </p>
        )}
        {activeView === "3d" && (
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
      ) : activeView === "grid" ? (
        <ProjectGrid projects={visible} />
      ) : activeView === "list" ? (
        <ProjectList projects={visible} />
      ) : (
        <Constellation3D
          projects={visible}
          sceneKey={sceneKey}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={setSelectedId}
          onMove={handleMove}
          onFallback={() => setView("grid")}
        />
      )}
    </section>
  );
}
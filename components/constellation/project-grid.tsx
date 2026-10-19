import Link from "next/link";
import type { ConstellationProject } from "./constellation-scene";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constellation";

export function progressLabel(p: ConstellationProject) {
  if (p.taskCount === 0) return "No tasks yet";
  return `${p.progress}% · ${p.doneCount} of ${p.taskCount} tasks done`;
}

export function ProjectGrid({ projects }: { projects: ConstellationProject[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <li key={p.id}>
          <Link
            href={`/projects/${p.id}`}
            className="grid h-full gap-3 rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: p.color }} />
              <h3 className="font-medium">{p.name}</h3>
            </div>
            <p className="text-sm" style={{ color: STATUS_COLORS[p.status] }}>
              {STATUS_LABELS[p.status] ?? p.status}
            </p>
            {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
            <div className="mt-auto grid gap-1.5">
              <p className="text-xs text-muted-foreground">{progressLabel(p)}</p>
              <div
                role="progressbar"
                aria-label={`${p.name} progress`}
                aria-valuenow={p.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-cyan-400" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
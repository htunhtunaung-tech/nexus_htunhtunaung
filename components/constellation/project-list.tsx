import Link from "next/link";
import type { ConstellationProject } from "./constellation-scene";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constellation";

export function ProjectList({ projects }: { projects: ConstellationProject[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Project</th>
            <th scope="col" className="px-4 py-2 font-medium">Status</th>
            <th scope="col" className="px-4 py-2 font-medium">Progress</th>
            <th scope="col" className="px-4 py-2 font-medium">Tasks</th>
            <th scope="col" className="px-4 py-2 font-medium">
              <span className="sr-only">Links</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-3">
                <Link href={`/projects/${p.id}`} className="flex items-center gap-2 font-medium hover:underline">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </Link>
              </td>
              <td className="px-4 py-3" style={{ color: STATUS_COLORS[p.status] }}>
                {STATUS_LABELS[p.status] ?? p.status}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    role="progressbar"
                    aria-label={`${p.name} progress`}
                    aria-valuenow={p.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {p.doneCount}/{p.taskCount}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/projects/${p.id}/tasks`} className="text-xs text-cyan-400 hover:underline">
                  Task board
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
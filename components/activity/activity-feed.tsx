import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: unknown;
};

// Turn a log entry into a short sentence
function describe(action: string, entity: string, meta: Record<string, unknown> | null) {
  const label =
    typeof meta?.name === "string" ? meta.name : typeof meta?.title === "string" ? meta.title : null;
  const thing = label ? `${entity} "${label}"` : `a ${entity}`;
  switch (action) {
    case "joined":
      return "joined the workspace";
    case "invited":
      return "invited a new member";
    default:
      return `${action} ${thing}`;
  }
}

function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export async function ActivityFeed({ workspaceId }: { workspaceId: string }) {
  const supabase = await createClient();

  // RLS only returns activity for workspaces this user belongs to
  const { data } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, metadata, created_at, profiles(display_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(15);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <section aria-labelledby="activity-heading" className="grid gap-3">
      <h2 id="activity-heading" className="text-lg font-medium">
        Recent activity
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet. Create a project to get started.</p>
      ) : (
        <ol className="grid gap-2">
          {rows.map((r) => {
            const joined = r.profiles as { display_name: string | null } | { display_name: string | null }[] | null;
            const profile = Array.isArray(joined) ? joined[0] ?? null : joined;
            return (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                <p>
                  <span className="font-medium">{profile?.display_name ?? "Someone"}</span>{" "}
                  <span className="text-muted-foreground">{describe(r.action, r.entity_type, r.metadata)}</span>
                </p>
                <time dateTime={r.created_at} className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(r.created_at)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
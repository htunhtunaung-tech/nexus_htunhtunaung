// Analytics calculations, kept separate so they're easy to test

export type AnalyticsTask = {
  status: string;
  due_date: string | null;
  completed_at: string | null;
  assignee_id: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

// Totals for the number tiles
export function summarize(tasks: AnalyticsTask[], today: string) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const open = total - done;
  const overdue = tasks.filter(
    (t) => t.status !== "done" && t.due_date !== null && t.due_date < today
  ).length;
  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, open, overdue, completionRate };
}

// How many tasks were finished on each of the last `days` days (UTC dates)
export function completedPerDay(tasks: AnalyticsTask[], today: string, days = 14) {
  const end = new Date(`${today}T00:00:00Z`).getTime();
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.completed_at) continue;
    const day = t.completed_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(end - (days - 1 - i) * DAY);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      completed: counts.get(key) ?? 0,
    };
  });
}

// Open (not done) tasks per person, busiest first
export function workloadByAssignee(tasks: AnalyticsTask[], names: Map<string, string>) {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (t.status === "done") continue;
    const key = t.assignee_id ?? "unassigned";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts, ([id, open]) => ({
    name: id === "unassigned" ? "Unassigned" : names.get(id) ?? "Former member",
    open,
  })).sort((a, b) => b.open - a.open);
}
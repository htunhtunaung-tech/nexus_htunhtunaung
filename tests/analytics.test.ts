import { describe, expect, it } from "vitest";
import { completedPerDay, summarize, workloadByAssignee, type AnalyticsTask } from "@/lib/analytics";

// Make a task with sensible defaults, overriding only what each test needs
const task = (over: Partial<AnalyticsTask>): AnalyticsTask => ({
  status: "todo",
  due_date: null,
  completed_at: null,
  assignee_id: null,
  ...over,
});

describe("summarize", () => {
  it("handles a project with no tasks", () => {
    expect(summarize([], "2026-10-21")).toEqual({ total: 0, done: 0, open: 0, overdue: 0, completionRate: 0 });
  });

  it("counts done, open and overdue tasks", () => {
    const tasks = [
      task({ status: "done" }),
      task({ status: "todo", due_date: "2026-10-20" }), // overdue
      task({ status: "in_progress", due_date: "2026-10-21" }), // due today, not overdue
      task({ status: "done", due_date: "2026-10-01" }), // done, so never overdue
    ];
    expect(summarize(tasks, "2026-10-21")).toEqual({ total: 4, done: 2, open: 2, overdue: 1, completionRate: 50 });
  });

  it("rounds the completion rate", () => {
    const tasks = [task({ status: "done" }), task({}), task({})];
    expect(summarize(tasks, "2026-10-21").completionRate).toBe(33);
  });
});

describe("completedPerDay", () => {
  it("returns one entry per day, ending today", () => {
    const days = completedPerDay([], "2026-10-21", 14);
    expect(days).toHaveLength(14);
    expect(days[0].date).toBe("2026-10-08");
    expect(days[13].date).toBe("2026-10-21");
  });

  it("counts tasks on the day they were completed", () => {
    const tasks = [
      task({ status: "done", completed_at: "2026-10-21T09:00:00+00:00" }),
      task({ status: "done", completed_at: "2026-10-21T15:30:00+00:00" }),
      task({ status: "done", completed_at: "2026-10-19T08:00:00+00:00" }),
      task({ status: "done", completed_at: "2026-09-01T08:00:00+00:00" }), // older than 7 days
    ];
    const days = completedPerDay(tasks, "2026-10-21", 7);
    expect(days.find((d) => d.date === "2026-10-21")?.completed).toBe(2);
    expect(days.find((d) => d.date === "2026-10-19")?.completed).toBe(1);
    expect(days.reduce((sum, d) => sum + d.completed, 0)).toBe(3);
  });
});

describe("workloadByAssignee", () => {
  it("counts only open tasks, busiest person first", () => {
    const names = new Map([
      ["u1", "Louis"],
      ["u2", "Test User"],
    ]);
    const tasks = [
      task({ assignee_id: "u1" }),
      task({ assignee_id: "u2" }),
      task({ assignee_id: "u2" }),
      task({ assignee_id: "u2", status: "done" }), // done, not counted
      task({}), // unassigned
    ];
    expect(workloadByAssignee(tasks, names)).toEqual([
      { name: "Test User", open: 2 },
      { name: "Louis", open: 1 },
      { name: "Unassigned", open: 1 },
    ]);
  });

  it("labels people who are no longer in the workspace", () => {
    expect(workloadByAssignee([task({ assignee_id: "gone" })], new Map())).toEqual([
      { name: "Former member", open: 1 },
    ]);
  });
});
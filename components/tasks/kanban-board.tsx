"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { updateTaskStatus } from "@/app/projects/[projectId]/tasks/actions";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";

export type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "text-muted-foreground",
  medium: "text-sky-400",
  high: "text-amber-400",
  urgent: "text-red-400",
};

export function KanbanBoard({ initialTasks, today }: { initialTasks: BoardTask[]; today: string }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // A small move (5px) is needed before a drag starts, so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const newStatus = event.over?.id as TaskStatus | undefined;
    if (!newStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Move the card right away, then save; undo if saving fails
    const previous = tasks;
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    setError(null);

    startTransition(async () => {
      const result = await updateTaskStatus(taskId, newStatus);
      if (result.error) {
        setTasks(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="grid gap-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DndContext id="kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
        <section
          aria-label="Task board"
          className="grid auto-cols-[minmax(200px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4"
        >
          {TASK_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              today={today}
            />
          ))}
        </section>
      </DndContext>
    </div>
  );
}

function Column({ status, tasks, today }: { status: TaskStatus; tasks: BoardTask[]; today: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-40 flex-col gap-3 rounded-xl border p-3 transition-colors ${
        isOver ? "border-cyan-400 bg-cyan-400/10" : "bg-muted/30"
      }`}
    >
      <h2 className="flex items-center justify-between text-sm font-medium">
        {STATUS_LABELS[status]}
        <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">{tasks.length}</span>
      </h2>

      {tasks.length === 0 && <p className="text-xs text-muted-foreground">Drop tasks here</p>}

      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} today={today} />
      ))}
    </div>
  );
}

function TaskCard({ task, today }: { task: BoardTask; today: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const overdue = task.due_date !== null && task.due_date < today && task.status !== "done";

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`grid cursor-grab gap-2 rounded-lg border bg-background p-3 ${
        isDragging ? "relative z-10 cursor-grabbing opacity-80 shadow-lg ring-2 ring-cyan-400" : ""
      }`}
    >
      <h3 className="text-sm font-medium">{task.title}</h3>
      {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      <div className="flex items-center justify-between text-xs">
        <span className={PRIORITY_STYLES[task.priority]}>{PRIORITY_LABELS[task.priority]}</span>
        {task.due_date && (
          <span className={overdue ? "font-medium text-red-400" : "text-muted-foreground"}>
            {overdue ? "Overdue · " : "Due "}
            {task.due_date}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <TaskStatusSelect taskId={task.id} status={task.status} />
        </div>
        <EditTaskDialog task={task} />
      </div>
    </article>
  );
}
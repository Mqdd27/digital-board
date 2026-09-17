"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays } from "lucide-react";
import { initials, PRIORITY_CFG, type Task } from "@/lib/board";
import { Avatar } from "./avatar";

export function TaskCard({ task, onOpen, overlay = false }: { task: Task; onOpen?: () => void; overlay?: boolean }) {
  const priority = PRIORITY_CFG[task.priority];
  return (
    <div
      onClick={onOpen}
      className={`group rounded-lg border bg-card p-3 shadow-sm transition-all ${
        overlay ? "rotate-1 cursor-grabbing shadow-lg" : "cursor-grab hover:-translate-y-px hover:shadow-md"
      }`}
    >
      <p className="mb-2.5 text-sm font-medium leading-snug">{task.title}</p>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {task.label && (
          <span className="rounded border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {task.label}
          </span>
        )}
        <span
          style={{ color: priority.color, background: priority.bg }}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
        >
          {priority.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {task.dueDate}
            </span>
          )}
        </div>
        {task.assignee && (
          <Avatar initials={initials(task.assignee.name)} color={task.assignee.color} size={22} />
        )}
      </div>
    </div>
  );
}

export function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}

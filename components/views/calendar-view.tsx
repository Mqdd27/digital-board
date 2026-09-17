"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PRIORITY_CFG, type Column, type Task } from "@/lib/board";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function CalendarView({ columns, onOpen }: { columns: Column[]; onOpen: (t: Task) => void }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const tasks = columns.flatMap((c) => c.tasks.filter((t) => t.dueDate));
  const undated = columns.flatMap((c) => c.tasks.filter((t) => !t.dueDate)).length;

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start Monday
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const today = iso(new Date());

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-2.5">
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-40 text-sm font-semibold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
        {undated > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{undated} tasks with no due date</span>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-7 border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 overflow-auto">
        {days.map((d) => {
          const key = iso(d);
          const dayTasks = tasks.filter((t) => t.dueDate === key);
          const outside = d.getMonth() !== month.getMonth();
          return (
            <div key={key} className={`min-h-24 border-b border-r p-1.5 ${outside ? "bg-secondary/40" : ""}`}>
              <div
                className={`mb-1 inline-flex size-5 items-center justify-center rounded-full text-[11px] ${
                  key === today ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-1">
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onOpen(t)}
                    style={{ borderLeftColor: PRIORITY_CFG[t.priority].color }}
                    className="truncate rounded border border-l-2 bg-card px-1.5 py-1 text-left text-[11px] leading-tight transition-colors hover:bg-secondary"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

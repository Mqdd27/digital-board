"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  FileText,
  Filter,
  Home,
  Inbox,
  LayoutGrid,
  List,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  PenTool,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";

type Priority = "low" | "medium" | "high";
type Status = "backlog" | "in-progress" | "review" | "done";

type Task = {
  id: string;
  title: string;
  label: string;
  priority: Priority;
  initials: string;
  avatarColor: string;
  dueDate: string;
  comments: number;
  attachments: number;
};

const COLUMNS: { id: Status; title: string; tasks: Task[] }[] = [
  {
    id: "backlog",
    title: "Backlog",
    tasks: [
      { id: "t1", title: "Redesign onboarding flow", label: "Design", priority: "medium", initials: "MC", avatarColor: "#6366f1", dueDate: "Sep 28", comments: 3, attachments: 1 },
      { id: "t2", title: "Audit accessibility across all pages", label: "QA", priority: "high", initials: "LT", avatarColor: "#f59e0b", dueDate: "Oct 2", comments: 0, attachments: 0 },
      { id: "t3", title: "Write API docs for v2 endpoints", label: "Docs", priority: "low", initials: "PN", avatarColor: "#10b981", dueDate: "Oct 10", comments: 1, attachments: 2 },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    tasks: [
      { id: "t4", title: "Implement dark mode token system", label: "Engineering", priority: "high", initials: "JM", avatarColor: "#ec4899", dueDate: "Sep 22", comments: 7, attachments: 3 },
      { id: "t5", title: "Dashboard performance optimization", label: "Engineering", priority: "medium", initials: "FA", avatarColor: "#8b5cf6", dueDate: "Sep 25", comments: 4, attachments: 0 },
    ],
  },
  {
    id: "review",
    title: "In Review",
    tasks: [
      { id: "t6", title: "Billing integration — Stripe webhooks", label: "Engineering", priority: "high", initials: "DR", avatarColor: "#ef4444", dueDate: "Sep 20", comments: 12, attachments: 1 },
      { id: "t7", title: "Marketing landing page copy", label: "Content", priority: "low", initials: "MC", avatarColor: "#6366f1", dueDate: "Sep 21", comments: 2, attachments: 0 },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      { id: "t8", title: "Set up CI/CD pipeline", label: "DevOps", priority: "medium", initials: "JM", avatarColor: "#ec4899", dueDate: "Sep 15", comments: 5, attachments: 2 },
      { id: "t9", title: "User interview synthesis — Q3", label: "Research", priority: "low", initials: "PN", avatarColor: "#10b981", dueDate: "Sep 17", comments: 8, attachments: 4 },
    ],
  },
];

const VIEWS = [
  { Icon: LayoutGrid, label: "Board" },
  { Icon: List, label: "List" },
  { Icon: Calendar, label: "Calendar" },
  { Icon: BarChart3, label: "Analytics" },
];

const SIDEBAR_LINKS = [
  { Icon: Home, label: "Home" },
  { Icon: Inbox, label: "Inbox", badge: 4 },
  { Icon: CheckSquare, label: "My Tasks" },
  { Icon: FileText, label: "Docs" },
  { Icon: Settings, label: "Settings" },
];

const PRIORITY_CFG: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { label: "High", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  medium: { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  low: { label: "Low", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
};

const STATUS_DOT: Record<Status, string> = {
  backlog: "#6b7280",
  "in-progress": "#3b82f6",
  review: "#f59e0b",
  done: "#10b981",
};

const MEMBERS = [
  { initials: "MC", color: "#6366f1" },
  { initials: "JM", color: "#ec4899" },
  { initials: "LT", color: "#f59e0b" },
  { initials: "FA", color: "#8b5cf6" },
  { initials: "PN", color: "#10b981" },
];

function Avatar({ initials, color, size = 24 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      className="flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
    >
      {initials}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const priority = PRIORITY_CFG[task.priority];
  return (
    <div className="group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <button className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
          <MoreHorizontal className="size-3.5" />
        </button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {task.label}
        </span>
        <span
          style={{ color: priority.color, background: priority.bg }}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
        >
          {priority.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {task.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" /> {task.comments}
            </span>
          )}
          {task.attachments > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="size-3" /> {task.attachments}
            </span>
          )}
          <span>{task.dueDate}</span>
        </div>
        <Avatar initials={task.initials} color={task.avatarColor} size={22} />
      </div>
    </div>
  );
}

export default function BoardPage() {
  const [activeView, setActiveView] = useState(0);
  const [activeSidebar, setActiveSidebar] = useState(2);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        style={{ width: collapsed ? 54 : 220, transition: "width 200ms cubic-bezier(0.4,0,0.2,1)" }}
        className="flex shrink-0 flex-col overflow-hidden border-r"
      >
        <div className="flex h-14 items-center border-b px-3">
          <button onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center gap-2.5">
            <LogoMark size={28} />
            {!collapsed && <span className="whitespace-nowrap text-sm font-semibold tracking-tight">Workspace</span>}
          </button>
        </div>

        {!collapsed && (
          <div className="px-2 pt-2">
            <Link
              href="/"
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
              Back to home
            </Link>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {SIDEBAR_LINKS.map(({ Icon, label, badge }, i) => (
            <button
              key={label}
              onClick={() => setActiveSidebar(i)}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-all ${
                activeSidebar === i ? "bg-secondary font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              {!collapsed && badge && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className="border-t p-2">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
            {["Launch Campaign", "Product v2.0", "Q4 Planning"].map((p, i) => (
              <button key={p} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-secondary">
                <div className="size-2 shrink-0 rounded-full" style={{ background: ["#6366f1", "#ec4899", "#10b981"][i] }} />
                <span className="text-xs text-muted-foreground">{p}</span>
              </button>
            ))}
          </div>
        )}

        <div className="border-t p-2">
          <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary">
            <Avatar initials="JD" color="#6366f1" size={26} />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-medium">Jordan Doe</p>
                  <p className="truncate text-[10px] text-muted-foreground">j.doe@acme.com</p>
                </div>
                <ChevronDown className="size-3 text-muted-foreground" />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b px-5">
          <div className="mr-2 flex items-center gap-2">
            <h1 className="text-sm font-semibold">Product v2.0</h1>
            <ChevronDown className="size-3 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-0.5 rounded-md border bg-secondary p-0.5">
            {VIEWS.map(({ Icon, label }, i) => (
              <button
                key={label}
                onClick={() => setActiveView(i)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-all ${
                  activeView === i ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
            <div className="mx-0.5 h-4 w-px bg-border" />
            <Link
              href="/board/demo"
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-muted-foreground transition-all hover:bg-card hover:text-foreground"
            >
              <PenTool className="size-3.5" />
              Canvas
            </Link>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="hidden min-w-[150px] items-center gap-1.5 rounded-md border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground sm:flex">
              <Search className="size-3.5" />
              <span>Search tasks…</span>
            </div>
            <button className="hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary sm:flex">
              <Filter className="size-3.5" />
              Filter
            </button>
            <ThemeToggle />
            <button className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Bell className="size-4" />
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#ef4444]" />
            </button>
            <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <Plus className="size-3" />
              New Task
            </button>
          </div>
        </header>

        {/* Sub-header */}
        <div className="flex shrink-0 flex-wrap items-center gap-4 border-b px-5 py-2.5">
          <div className="flex items-center">
            {MEMBERS.map((m, i) => (
              <div key={m.initials + i} style={{ marginLeft: i === 0 ? 0 : -6 }} className="rounded-full ring-2 ring-background">
                <Avatar initials={m.initials} color={m.color} size={26} />
              </div>
            ))}
            <button className="ml-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">+3 members</button>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="size-2 rounded-full bg-[#3b82f6]" />
            Sprint 12 — Sep 16–Sep 30
          </div>

          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-20 overflow-hidden rounded-full border bg-secondary">
              <div className="h-full rounded-full bg-[#10b981]" style={{ width: "44%" }} />
            </div>
            <span>44% complete</span>
          </div>
        </div>

        {/* Kanban */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full min-w-[820px] gap-4 p-5">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex min-w-[200px] max-w-[320px] flex-1 flex-col gap-2">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full" style={{ background: STATUS_DOT[col.id] }} />
                    <span className="text-sm font-semibold">{col.title}</span>
                    <span className="rounded-full border bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {col.tasks.length}
                    </span>
                  </div>
                  <button className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <Plus className="size-3" />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
                  {col.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  <button className="flex items-center gap-1.5 rounded-md px-1 py-2 text-xs text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
                    <Plus className="size-3" />
                    <span>Add task</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

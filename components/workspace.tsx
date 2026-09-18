"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3, Bell, Calendar, CheckSquare, Filter, Home, Inbox,
  LayoutGrid, List, LogOut, MessageSquare, PenLine, Plus, Search, Settings, X,
} from "lucide-react";
import { applyFilters, initials, type Column, type Filters, type Member, type Task } from "@/lib/board";
import { logoutAction, renameProject } from "@/lib/actions";
import type { CanvasMeta, FeedItem, MemberPresence, Project, Unread } from "@/lib/queries";
import type { User } from "@/lib/auth";
import { Avatar } from "./avatar";
import { LogoMark } from "./logo-mark";
import { EditableTitle } from "./editable-title";
import { ThemeToggle } from "./theme-toggle";
import { TaskDialog } from "./task-dialog";
import { HomeView } from "./views/home-view";
import { BoardView } from "./views/board-view";
import { ListView } from "./views/list-view";
import { CalendarView } from "./views/calendar-view";
import { CanvasView } from "./views/canvas-view";
import { AnalyticsView, type Stats } from "./views/analytics-view";
import { MyTasksView, type MyTask } from "./views/my-tasks-view";
import { MembersPanel } from "./members-panel";
import { ChatView, PresenceDot, UnreadBadge } from "./views/chat-view";

const VIEWS = [
  { Icon: LayoutGrid, label: "Board" },
  { Icon: List, label: "List" },
  { Icon: Calendar, label: "Calendar" },
  { Icon: BarChart3, label: "Analytics" },
];

type SectionKey = "home" | "board" | "canvas" | "chat" | "inbox" | "mine" | "settings";

const SECTIONS: { key: SectionKey; Icon: typeof Home; label: string }[] = [
  { key: "home", Icon: Home, label: "Home" },
  { key: "board", Icon: LayoutGrid, label: "Board" },
  { key: "canvas", Icon: PenLine, label: "Canvas" },
  { key: "chat", Icon: MessageSquare, label: "Chat" },
  { key: "inbox", Icon: Inbox, label: "Inbox" },
  { key: "mine", Icon: CheckSquare, label: "My Tasks" },
  { key: "settings", Icon: Settings, label: "Settings" },
];

export function Workspace({
  user, workspace, projects, project, columns, members, presence, feed, mine, stats, sheets, today, dark,
}: {
  user: User;
  workspace: string;
  projects: Project[];
  project: Project | null;
  columns: Column[];
  members: Member[];
  feed: FeedItem[];
  mine: MyTask[];
  stats: Stats | null;
  sheets: CanvasMeta[];
  presence: MemberPresence[];
  today: string;
  dark: boolean;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>("home");
  const [view, setView] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const filtered = useMemo(() => applyFilters(columns, filters), [columns, filters]);
  const activeFilters = [filters.assignee, filters.priority, filters.label].filter(Boolean).length;
  const shown = filtered.reduce((s, c) => s + c.tasks.length, 0);
  const total = columns.reduce((s, c) => s + c.tasks.length, 0);
  const labels = [...new Set(columns.flatMap((c) => c.tasks.map((t) => t.label).filter(Boolean)))] as string[];
  const onBoard = section === "board";

  // Keep presence and unread badges live outside the Chat section. The ping is
  // also what keeps this user's own status "online" while they sit on a board.
  const [live, setLive] = useState<MemberPresence[]>(presence);
  const [unread, setUnread] = useState<Unread[]>([]);
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const res = await fetch("/api/presence", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { members: MemberPresence[]; unread: Unread[] };
        setLive(data.members);
        setUnread(data.unread);
      } catch {
        // Offline for a tick; the next one recovers.
      }
    };
    void ping();
    const t = setInterval(ping, 45_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const online = live.filter((m) => m.presence === "online").length;
  const unreadTotal = section === "chat" ? 0 : unread.reduce((n, u) => n + u.n, 0);

  const close = () => {
    setEditing(null);
    setCreating(null);
    router.refresh();
  };

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
            {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">{workspace}</span>}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
          {SECTIONS.map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-all ${
                section === key ? "bg-secondary font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              {!collapsed && key === "chat" && (
                unreadTotal > 0 ? (
                  <UnreadBadge n={unreadTotal} />
                ) : online > 0 ? (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                    <PresenceDot presence="online" />
                    {online}
                  </span>
                ) : null
              )}
              {!collapsed && key === "inbox" && feed.length > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {feed.length}
                </span>
              )}
              {!collapsed && key === "mine" && mine.length > 0 && (
                <span className="ml-auto rounded-full border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {mine.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {!collapsed && projects.length > 0 && (
          <div className="border-t p-2">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/board?project=${p.id}`}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-secondary ${
                  p.id === project?.id ? "bg-secondary" : ""
                }`}
              >
                <div
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: p.id === project?.id ? "var(--chart-1)" : "var(--muted-foreground)" }}
                />
                <span className="truncate text-xs">{p.name}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="border-t p-2">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <Avatar initials={initials(user.name)} color={user.color} size={26} />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{user.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                </div>
                <form action={logoutAction}>
                  <button title="Sign out" className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <LogOut className="size-3.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b px-5">
          {onBoard && project ? (
            <EditableTitle
              value={project.name}
              onSave={(name) => renameProject(project.id, name).then((r) => { router.refresh(); return r; })}
              className="text-sm font-semibold"
              inputClassName="text-sm font-semibold w-48"
            />
          ) : (
            <h1 className="text-sm font-semibold">
              {onBoard ? "Board" : SECTIONS.find((s) => s.key === section)!.label}
            </h1>
          )}

          {onBoard && project && (
            <div className="flex items-center gap-0.5 rounded-md border bg-secondary p-0.5">
              {VIEWS.map(({ Icon, label }, i) => (
                <button
                  key={label}
                  onClick={() => setView(i)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-all ${
                    view === i ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {onBoard && project && (
              <>
                <label className="hidden min-w-[180px] items-center gap-1.5 rounded-md border bg-secondary px-2.5 py-1.5 text-xs sm:flex">
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={filters.q ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    placeholder="Search tasks…"
                    className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <button
                  onClick={() => setShowFilters((s) => !s)}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary ${
                    activeFilters ? "border-primary font-medium" : "text-muted-foreground"
                  }`}
                >
                  <Filter className="size-3.5" />
                  Filter
                  {activeFilters > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilters}</span>
                  )}
                </button>
              </>
            )}
            <ThemeToggle />
            <button
              onClick={() => setSection("inbox")}
              className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Bell className="size-4" />
              {feed.length > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--chart-7)]" />}
            </button>
            {project && section !== "canvas" && (
              <button
                onClick={() => setCreating(columns[0]?.id ?? "")}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="size-3" />
                New Task
              </button>
            )}
          </div>
        </header>

        {/* Filter bar */}
        {onBoard && showFilters && project && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-secondary/50 px-5 py-2.5 text-xs">
            <select
              value={filters.assignee ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value || undefined }))}
              className="rounded-md border bg-background px-2 py-1"
            >
              <option value="">All assignees</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={filters.priority ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value || undefined }))}
              className="rounded-md border bg-background px-2 py-1"
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {labels.length > 0 && (
              <select
                value={filters.label ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, label: e.target.value || undefined }))}
                className="rounded-md border bg-background px-2 py-1"
              >
                <option value="">All labels</option>
                {labels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setFilters({ q: filters.q })}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="size-3" />
              Reset
            </button>
            <span className="ml-auto text-muted-foreground">
              {shown} of {total} tasks
            </span>
          </div>
        )}

        {/* Content */}
        {section === "home" ? (
          <HomeView
            userName={user.name}
            project={project}
            columnCount={columns.length}
            today={today}
            stats={stats}
            mine={mine}
            feed={feed}
            onGo={setSection}
          />
        ) : section === "chat" ? (
          <ChatView meId={user.id} initialMembers={live} />
        ) : section === "settings" ? (
          <MembersPanel presence={live} isAdmin={user.is_admin === 1} projects={projects} activeProjectId={project?.id ?? null} />
        ) : !project ? (
          <EmptyProject />
        ) : section === "canvas" ? (
          <CanvasView projectId={project.id} sheets={sheets} dark={dark} onChanged={() => router.refresh()} />
        ) : section === "inbox" ? (
          <FeedView feed={feed} />
        ) : section === "mine" ? (
          <MyTasksView tasks={mine} onOpen={(id) => setEditing(columns.flatMap((c) => c.tasks).find((t) => t.id === id) ?? null)} />
        ) : view === 0 ? (
          <BoardView columns={filtered} projectId={project.id} onOpen={setEditing} onAdd={setCreating} />
        ) : view === 1 ? (
          <ListView columns={filtered} onOpen={setEditing} />
        ) : view === 2 ? (
          <CalendarView columns={filtered} onOpen={setEditing} />
        ) : (
          stats && <AnalyticsView stats={stats} />
        )}
      </div>

      {(editing || creating !== null) && (
        <TaskDialog
          task={editing}
          columns={columns}
          members={members}
          defaultColumnId={creating ?? undefined}
          onClose={close}
        />
      )}
    </div>
  );
}

function EmptyProject() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
      <p className="text-sm font-medium">No project yet</p>
      <p className="max-w-sm text-xs text-muted-foreground">Re-run setup to create your first project.</p>
    </div>
  );
}

function FeedView({ feed }: { feed: FeedItem[] }) {
  if (feed.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }
  return (
    <main className="flex-1 overflow-y-auto">
      <ul className="mx-auto max-w-2xl divide-y px-5 py-6">
        {feed.map((e, i) => (
          <li key={i} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{e.taskTitle}</p>
              <p className="text-xs text-muted-foreground">
                {e.text}
                {e.actor ? ` · ${e.actor}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                <span className="size-1.5 rounded-full" style={{ background: e.columnColor }} />
                {e.columnTitle}
              </span>
              <span className="w-28 text-right text-[11px] text-muted-foreground">
                {e.atLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  CirclePlay,
  FileText,
  LayoutGrid,
  Star,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  { accent: "#6366f1", Icon: LayoutGrid, title: "Kanban Boards", desc: "Drag tasks across flexible columns. Backlog, in progress, review, done — build the workflow that fits your team." },
  { accent: "#ec4899", Icon: Timer, title: "Sprint Planning", desc: "Time-box your work into sprints. Track velocity, surface blockers early, and ship with confidence every cycle." },
  { accent: "#10b981", Icon: BarChart3, title: "Analytics & Reports", desc: "Burndown charts, cycle time, throughput — real-time data your team actually uses to move faster." },
  { accent: "#f59e0b", Icon: Users, title: "Team Collaboration", desc: "Comments, mentions, file attachments, and real-time presence — everyone stays in sync without the noise." },
  { accent: "#8b5cf6", Icon: FileText, title: "Docs & Notes", desc: "Write specs, meeting notes, and playbooks right alongside your tasks. Context lives where the work happens." },
  { accent: "#06b6d4", Icon: Zap, title: "Automations", desc: "Set triggers and actions to handle the repetitive stuff. Move tasks, send alerts, assign work — automatically." },
];

const PLANS = [
  { name: "Starter", price: "$0", period: "forever", desc: "Perfect for small teams and solo builders.", cta: "Start free", highlight: false, perks: ["Up to 3 projects", "5 team members", "Kanban & list views", "1 GB storage"] },
  { name: "Pro", price: "$12", period: "per seat / mo", desc: "For growing teams that ship fast.", cta: "Start 14-day trial", highlight: true, perks: ["Unlimited projects", "Unlimited members", "Sprint planning", "Analytics & reports", "Automations", "Priority support"] },
  { name: "Enterprise", price: "Custom", period: "contact sales", desc: "For large orgs with custom needs.", cta: "Talk to us", highlight: false, perks: ["SSO & SAML", "Audit logs", "Custom contracts", "Dedicated onboarding", "SLA guarantees"] },
];


const PREVIEW_COLUMNS = [
  { label: "Backlog", color: "#6b7280", tasks: ["Redesign onboarding", "API docs v2", "Audit accessibility"] },
  { label: "In Progress", color: "#3b82f6", tasks: ["Dark mode tokens", "Dashboard perf"] },
  { label: "In Review", color: "#f59e0b", tasks: ["Stripe webhooks", "Landing copy"] },
  { label: "Done", color: "#10b981", tasks: ["CI/CD pipeline", "Q3 research"] },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <div className="mr-4 flex items-center gap-2.5">
            <LogoMark />
            <span className="text-sm font-semibold tracking-tight">Workspace</span>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            {["Features", "Docs", "Blog"].map((link) => (
              <button key={link} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                {link}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <ThemeToggle />
          <button className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            Sign in
          </button>
          <Link href="/board" className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-[#10b981]" />
          Now with sprint automations — just shipped
        </div>

        <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          The workspace your
          <br />
          <span className="text-muted-foreground">team actually wants to use.</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground">
          Boards, sprints, docs, and automations — unified in one clean tool. Stop stitching together three apps and start shipping.
        </p>

        <div className="mb-16 flex flex-wrap items-center justify-center gap-3">
          <Link href="/board" className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Open the board
            <ArrowRight className="size-3.5" />
          </Link>
          <button className="flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary">
            Watch demo
            <CirclePlay className="size-3.5" />
          </button>
        </div>

        {/* Dashboard preview */}
        <div className="relative mx-auto max-w-[860px] overflow-hidden rounded-xl border bg-secondary shadow-[0_24px_64px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-1.5 border-b bg-card px-4 py-3">
            {["#ef4444", "#f59e0b", "#10b981"].map((c) => (
              <div key={c} className="size-2.5 rounded-full opacity-70" style={{ background: c }} />
            ))}
            <div className="mx-4 flex-1">
              <div className="mx-auto max-w-[200px] rounded border bg-secondary px-2.5 py-0.5 text-center text-[10px] text-muted-foreground">
                workspace.app/board
              </div>
            </div>
          </div>

          <div className="h-[340px] overflow-hidden p-4">
            <div className="flex h-full gap-3">
              {PREVIEW_COLUMNS.map((col) => (
                <div key={col.label} className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full" style={{ background: col.color }} />
                    <span className="text-[10px] font-semibold text-muted-foreground">{col.label}</span>
                    <span className="rounded-full border bg-secondary px-1 text-[9px] text-muted-foreground">{col.tasks.length}</span>
                  </div>
                  {col.tasks.map((task) => (
                    <div key={task} className="rounded-md border bg-card px-2.5 py-2 text-left text-[10px] font-medium leading-snug">
                      {task}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Features</p>
          <h2 className="text-3xl font-semibold tracking-tight">Everything in one place</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Not a feature dump — a focused set of tools built to work together, without the bloat.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ accent, Icon, title, desc }) => (
            <div key={title} className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-colors hover:bg-secondary">
              <div className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100" style={{ background: accent }} />
              <div className="mb-4 flex size-9 items-center justify-center rounded-lg" style={{ background: `${accent}15`, color: accent }}>
                <Icon className="size-5" />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="text-sm font-semibold">Workspace</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Workspace Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {["Privacy", "Terms", "Status"].map((l) => (
              <button key={l} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

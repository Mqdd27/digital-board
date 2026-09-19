"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus, Trash2 } from "lucide-react";
import { addProject, deleteProject, inviteMember, renameProject, renameWorkspace } from "@/lib/actions";
import { initials } from "@/lib/board";
import type { MemberPresence, Project } from "@/lib/queries";
import { Avatar } from "./avatar";
import { PresenceDot } from "./views/chat-view";
import { Field, FormError, SubmitButton } from "./form-bits";
import { EditableTitle } from "./editable-title";

const ago = (iso: string | null) => {
  if (!iso) return "never signed in";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
};

export function MembersPanel({
  workspace, presence, isAdmin, projects, activeProjectId,
}: {
  workspace: string;
  presence: MemberPresence[];
  isAdmin: boolean;
  projects: Project[];
  activeProjectId: string | null;
}) {
  const router = useRouter();
  const [state, action] = useActionState(inviteMember, null);
  const [newProject, setNewProject] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const online = presence.filter((m) => m.presence === "online").length;

  async function createProject() {
    const name = newProject.trim();
    if (!name || busy) return;
    setBusy(true);
    const res = await addProject(name);
    setBusy(false);
    if (res?.error) return setProjectError(res.error);
    setNewProject("");
    setProjectError(null);
    router.push(`/board?project=${res.id}`);
    router.refresh();
  }

  async function removeProject(p: Project) {
    if (!confirm(`Delete "${p.name}"? Its columns, tasks, history and canvas sheets are deleted with it.`)) return;
    const res = await deleteProject(p.id);
    if (res?.error) return setProjectError(res.error);
    setProjectError(null);
    router.push("/board");
    router.refresh();
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-lg flex-col gap-8 px-5 py-6">
        <section>
          <h2 className="text-sm font-semibold">Workspace</h2>
          <p className="mb-3 text-xs text-muted-foreground">Click the name to rename this workspace.</p>
          <EditableTitle
            value={workspace}
            onSave={(name) => renameWorkspace(name).then((res) => { router.refresh(); return res; })}
            className="rounded-lg border bg-card px-3 py-2 text-sm font-medium"
            inputClassName="w-full text-sm font-medium"
          />
        </section>

        {/* Members */}
        <section>
          <h2 className="text-sm font-semibold">Members</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {presence.length} in this workspace · {online} online now
          </p>
          <ul className="flex flex-col gap-1">
            {presence.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
                <span className="relative shrink-0">
                  <Avatar initials={initials(m.name)} color={m.color} size={28} />
                  <PresenceDot presence={m.presence} className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {m.name}
                    {m.is_admin === 1 && (
                      <span className="ml-1.5 rounded-full border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] capitalize">{m.presence}</p>
                  <p className="text-[10px] text-muted-foreground">{ago(m.lastSeen)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Projects */}
        <section>
          <h2 className="text-sm font-semibold">Projects</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            New projects start with the default columns. {isAdmin ? "" : "Only admins can delete one."}
          </p>
          <ul className="mb-3 flex flex-col gap-1">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: p.id === activeProjectId ? "var(--chart-1)" : "var(--muted-foreground)" }}
                />
                <EditableTitle
                  value={p.name}
                  onSave={(name) => renameProject(p.id, name).then((res) => { router.refresh(); return res; })}
                  className="min-w-0 flex-1 text-sm"
                  inputClassName="min-w-0 flex-1 text-sm"
                />
                {isAdmin && (
                  <button
                    onClick={() => void removeProject(p)}
                    title="Delete project"
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-[rgba(239,68,68,0.08)] hover:text-[var(--chart-7)]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createProject();
                }
              }}
              placeholder="New project name"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <button
              onClick={() => void createProject()}
              disabled={busy || !newProject.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-40"
            >
              <FolderPlus className="size-3.5" />
              {busy ? "Adding…" : "Add"}
            </button>
          </div>
          {projectError && <p className="mt-2 text-xs text-[var(--chart-7)]">{projectError}</p>}
        </section>

        {/* Invite */}
        {isAdmin && (
          <section>
            <h2 className="text-sm font-semibold">Add member</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Create the account, then share the email and password with them.
            </p>
            <form action={action} className="flex flex-col gap-4 rounded-xl border bg-card p-5">
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Temporary password" name="password" type="password" required minLength={8} />
              <FormError error={state?.error} />
              {state?.ok && <p className="text-xs text-[var(--chart-2)]">Member added.</p>}
              <SubmitButton>
                <span className="flex items-center gap-1.5">
                  <Plus className="size-3.5" /> Add member
                </span>
              </SubmitButton>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

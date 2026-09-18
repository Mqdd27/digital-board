"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import "@excalidraw/excalidraw/index.css";
import { createCanvas, deleteCanvas, renameCanvas } from "@/lib/actions";
import type { CanvasMeta } from "@/lib/queries";

// Excalidraw is browser-only and heavy — keep it out of the server bundle and
// off the initial board payload.
const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((m) => m.Excalidraw), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading canvas…</div>
  ),
});

const SAVE_DEBOUNCE = 800;

/**
 * The canvas arrives as its own lazily-loaded chunk. A deploy replaces those
 * chunk files, so a tab that was open across the deploy asks for hashes that no
 * longer exist: the import rejects and `next/dynamic` renders *nothing*. The
 * canvas area goes blank — on a dark theme, an alarming black rectangle that
 * looks like lost work. Nothing is lost; the page just needs reloading.
 */
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-sm font-medium">The canvas could not load</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          This usually means the app was updated while this tab was open. Your drawing is safe — reload to pick up the
          new version.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Reload
        </button>
      </div>
    );
  }
}

type Api = { getSceneElements: () => readonly unknown[]; getAppState: () => object; getFiles: () => object };

export function CanvasView({
  projectId,
  sheets,
  dark,
  onChanged,
}: {
  projectId: string;
  sheets: CanvasMeta[];
  dark: boolean;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const apiRef = useRef<Api | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived, not synced: a deleted sheet falls back to the first one without an
  // effect round-trip (and without the cascading render that comes with one).
  const activeId = selected && sheets.some((s) => s.id === selected) ? selected : (sheets[0]?.id ?? null);

  // Excalidraw accepts a promise for initialData, so the sheet loads itself on
  // mount instead of mounting empty and being filled afterwards.
  const initialData = useMemo(() => {
    if (!activeId) return null;
    return fetch(`/api/canvas/${activeId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((saved) => (saved ? { ...saved, scrollToContent: true } : null))
      .catch(() => null); // a corrupt or unreachable snapshot starts empty rather than throwing
  }, [activeId]);

  /**
   * `unload` marks the last-gasp save fired from pagehide, the only place
   * `keepalive` is worth having and the only place it is safe: the Fetch
   * standard caps a keepalive body at 64 KiB and Chromium rejects anything
   * larger outright, which silently dropped every drawing containing an image.
   */
  const flush = useCallback(
    async (unload = false) => {
      const api = apiRef.current;
      if (!api || !activeId) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;

      const { serializeAsJSON } = await import("@excalidraw/excalidraw");
      const body = serializeAsJSON(
        api.getSceneElements() as never,
        api.getAppState() as never,
        api.getFiles() as never,
        "local",
      );
      if (unload && body.length > 60_000) return;

      setStatus("saving");
      try {
        const res = await fetch(`/api/canvas/${activeId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          ...(unload ? { keepalive: true } : {}),
        });
        setStatus(res.ok ? "idle" : "error");
      } catch {
        setStatus("error");
      }
    },
    [activeId],
  );

  // Persist whatever is on screen before the sheet swaps out or the tab closes.
  useEffect(() => {
    const onHide = () => void flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE);
  }, [flush]);

  async function addSheet() {
    await flush();
    await createCanvas(projectId, `Sheet ${sheets.length + 1}`);
    onChanged();
  }

  async function switchTo(id: string) {
    if (id === activeId) return;
    await flush();
    setSelected(id);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Sheet tabs */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-1.5">
        {sheets.map((s) => {
          const active = s.id === activeId;
          return (
            <div
              key={s.id}
              className={`group flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                active ? "border-primary bg-secondary font-medium" : "border-transparent text-muted-foreground hover:bg-secondary"
              }`}
            >
              {renaming === s.id ? (
                <form
                  action={async (fd) => {
                    await renameCanvas(s.id, String(fd.get("name") ?? ""));
                    setRenaming(null);
                    onChanged();
                  }}
                  className="flex items-center gap-1"
                >
                  <input name="name" defaultValue={s.name} autoFocus className="w-24 rounded border bg-background px-1 py-0.5 text-xs outline-none" />
                  <button type="submit" className="text-muted-foreground hover:text-foreground">
                    <Check className="size-3" />
                  </button>
                </form>
              ) : (
                <>
                  <button onClick={() => switchTo(s.id)} className="max-w-32 truncate">
                    {s.name}
                  </button>
                  {active && (
                    <>
                      <button onClick={() => setRenaming(s.id)} title="Rename" className="text-muted-foreground hover:text-foreground">
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete sheet "${s.name}"? Its drawing goes with it.`)) return;
                          await deleteCanvas(s.id);
                          onChanged();
                        }}
                        title="Delete sheet"
                        className="text-muted-foreground hover:text-[var(--chart-7)]"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}

        <button
          onClick={addSheet}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-3" />
          Sheet
        </button>

        <span className="ml-auto shrink-0 pl-3 text-[11px] text-muted-foreground">
          {status === "saving" ? "Saving…" : status === "error" ? (
            <span className="text-[var(--chart-7)]">Save failed — retrying on next change</span>
          ) : activeId ? "Saved" : ""}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative flex-1">
        {activeId ? (
          // Remounting per sheet is what keeps one sheet's drawing out of another.
          <CanvasBoundary key={activeId}>
            <Excalidraw
              initialData={initialData}
              excalidrawAPI={(api: Api) => (apiRef.current = api)}
              onChange={schedule}
              theme={dark ? "dark" : "light"}
            />
          </CanvasBoundary>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">No sheets in this project yet.</p>
            <button onClick={addSheet} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              <Plus className="size-3" />
              Create the first sheet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

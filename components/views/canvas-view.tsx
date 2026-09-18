"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import type { Editor } from "tldraw";
import "tldraw/tldraw.css";
import { createCanvas, deleteCanvas, renameCanvas } from "@/lib/actions";
import type { CanvasMeta } from "@/lib/queries";

// tldraw is browser-only and heavy — keep it out of the server bundle and off
// the initial board payload.
const Tldraw = dynamic(() => import("tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading canvas…</div>,
});

const SAVE_DEBOUNCE = 800;

export function CanvasView({
  projectId,
  sheets,
  onChanged,
}: {
  projectId: string;
  sheets: CanvasMeta[];
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const editorRef = useRef<Editor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived, not synced: a deleted sheet falls back to the first one without an
  // effect round-trip (and without the cascading render that comes with one).
  const activeId = selected && sheets.some((s) => s.id === selected) ? selected : (sheets[0]?.id ?? null);

  /**
   * Save the current sheet.
   *
   * `unload` marks the last-gasp save fired from pagehide, which is the only
   * place `keepalive` is worth having — and the only place it is safe. The
   * Fetch standard caps a keepalive request body at 64 KiB, and Chromium
   * rejects anything bigger outright (net::ERR_ABORTED) rather than sending
   * it. A snapshot holding one pasted image is ~400 KiB, so a keepalive save
   * silently dropped every drawing that contained media: the canvas looked
   * fine until reload, then came back without it. Normal saves must never use
   * it.
   */
  const flush = useCallback(
    async (unload = false) => {
      const editor = editorRef.current;
      if (!editor || !activeId) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;

      const body = JSON.stringify(editor.getSnapshot());
      // Over the keepalive cap there is nothing useful to attempt on unload;
      // the 800ms debounce has almost certainly already stored this.
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
        // A failed save must never take the canvas down with it.
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

  const init = useCallback(
    async (editor: Editor) => {
      editorRef.current = editor;
      if (!activeId) return;

      try {
        const res = await fetch(`/api/canvas/${activeId}`, { cache: "no-store" });
        const saved = res.ok ? await res.json() : null;
        if (saved) editor.loadSnapshot(saved);
      } catch {
        // A corrupt or unreachable snapshot must not brick the sheet —
        // start it empty rather than throwing inside onMount.
      }

      editor.store.listen(
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE);
        },
        { scope: "document", source: "user" },
      );
    },
    [activeId, flush],
  );

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
                  <input
                    name="name"
                    defaultValue={s.name}
                    autoFocus
                    className="w-24 rounded border bg-background px-1 py-0.5 text-xs outline-none"
                  />
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
                          if (!confirm(`Delete sheet "${s.name}"? Gambarnya ikut terhapus.`)) return;
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
          <Tldraw key={activeId} onMount={(editor) => void init(editor)} className="absolute inset-0" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">No sheets in this project yet.</p>
            <button
              onClick={addSheet}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              <Plus className="size-3" />
              Create the first sheet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

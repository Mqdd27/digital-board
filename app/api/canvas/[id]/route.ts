import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get, run } from "@/lib/db";

/**
 * Canvas snapshots travel through a Route Handler, not a Server Action.
 * Server Actions cap the request body at 1 MB, and a canvas scene blows past
 * that as soon as a drawing gets real (pasted images are inlined as data URLs).
 * Route Handlers have no such cap, so raising `serverActions.bodySizeLimit`
 * would only move the failure, not remove it.
 */

async function guard(projectId: string, write = false) {
  const user = await currentUser();
  if (!user) return false;
  if (user.is_admin === 1) return true;
  const member = await get<{ role: string }>(
    "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
    projectId, user.id,
  );
  return !!member && (!write || member.role !== "viewer");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await get<{ snapshot: string | null; project_id: string }>("SELECT snapshot, project_id FROM canvases WHERE id = ?", id);
  if (!row || !await guard(row.project_id)) return new NextResponse("Not found", { status: 404 });

  // Already JSON on disk — hand it back verbatim rather than parse-then-restringify.
  return new NextResponse(row.snapshot ?? "null", {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const canvas = await get<{ project_id: string }>("SELECT project_id FROM canvases WHERE id = ?", id);
  if (!canvas || !await guard(canvas.project_id, true)) return new NextResponse("Not found", { status: 404 });

  const snapshot = await req.text();
  try {
    JSON.parse(snapshot);
  } catch {
    return new NextResponse("Invalid snapshot", { status: 400 });
  }

  await run("UPDATE canvases SET snapshot = ?, updated_at = ? WHERE id = ?", snapshot, new Date().toISOString(), id);
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get, run } from "@/lib/db";

/**
 * Canvas snapshots travel through a Route Handler, not a Server Action.
 * Server Actions cap the request body at 1 MB, and a tldraw snapshot blows past
 * that as soon as a drawing gets real (pasted images are inlined as data URLs).
 * Route Handlers have no such cap, so raising `serverActions.bodySizeLimit`
 * would only move the failure, not remove it.
 */

async function guard() {
  return (await currentUser()) !== null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const row = await get<{ snapshot: string | null }>("SELECT snapshot FROM canvases WHERE id = ?", id);
  if (!row) return new NextResponse("Not found", { status: 404 });

  // Already JSON on disk — hand it back verbatim rather than parse-then-restringify.
  return new NextResponse(row.snapshot ?? "null", {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!(await get("SELECT 1 FROM canvases WHERE id = ?", id))) return new NextResponse("Not found", { status: 404 });

  const snapshot = await req.text();
  try {
    JSON.parse(snapshot);
  } catch {
    return new NextResponse("Invalid snapshot", { status: 400 });
  }

  await run("UPDATE canvases SET snapshot = ?, updated_at = ? WHERE id = ?", snapshot, new Date().toISOString(), id);
  return new NextResponse(null, { status: 204 });
}

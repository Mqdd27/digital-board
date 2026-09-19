import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get } from "@/lib/db";

/** Attachments are never public: every download goes through the session check. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const row = await get<{ name: string; mime: string; size: number; data: Buffer | null }>(
    "SELECT name, mime, size, data FROM attachments WHERE id = ?",
    id,
  );
  if (!row) return new NextResponse("Not found", { status: 404 });
  if (!row.data) return new NextResponse("Attachment needs migration", { status: 410 });

  return new NextResponse(row.data as unknown as BodyInit, {
    headers: {
      "content-type": row.mime,
      "content-length": String(row.size),
      "content-disposition": `inline; filename="${encodeURIComponent(row.name)}"`,
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}

import { createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get, UPLOAD_DIR } from "@/lib/db";

/** Attachments are never public: every download goes through the session check. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const row = await get<{ name: string; mime: string }>("SELECT name, mime FROM attachments WHERE id = ?", id);
  if (!row) return new NextResponse("Not found", { status: 404 });

  // The id is a uuid from the row, never user input, so the path cannot escape.
  const path = join(UPLOAD_DIR, id);
  if (!existsSync(path)) return new NextResponse("File missing", { status: 410 });

  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "content-type": row.mime,
      "content-length": String(statSync(path).size),
      "content-disposition": `inline; filename="${encodeURIComponent(row.name)}"`,
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}

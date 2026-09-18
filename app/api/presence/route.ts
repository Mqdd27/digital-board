import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listMembersWithPresence, unreadCounts } from "@/lib/queries";

/**
 * Lightweight ping from the workspace shell so presence and unread badges stay
 * live outside the Chat section. `currentUser()` does the heartbeat itself.
 */
export async function GET() {
  const me = await currentUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  return NextResponse.json(
    { members: await listMembersWithPresence(), unread: await unreadCounts(me.id) },
    { headers: { "cache-control": "no-store" } },
  );
}

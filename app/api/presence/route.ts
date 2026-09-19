import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { activityNotifications, listMembersWithPresence, markActivityRead, unreadCounts } from "@/lib/queries";

/**
 * Lightweight ping from the workspace shell so presence and unread badges stay
 * live outside the Chat section. `currentUser()` does the heartbeat itself.
 */
export async function GET() {
  const me = await currentUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  return NextResponse.json(
    { members: await listMembersWithPresence(), unread: await unreadCounts(me.id), notifications: await activityNotifications(me.id) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST() {
  const me = await currentUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  await markActivityRead(me.id);
  return new NextResponse(null, { status: 204 });
}

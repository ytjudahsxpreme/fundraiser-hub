import { NextResponse, type NextRequest } from "next/server";
import { firebaseDataSource } from "@/lib/data/firebaseDataSource";
import { isUnlockedRequest } from "@/lib/auth/cookies";

export const runtime = "nodejs";
// Server-side response cache. Lookup pages auto-refresh every few seconds;
// without this we'd hammer the Sheets API. Keep this tight so live edits show
// up fast.
export const revalidate = 20;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUnlockedRequest(req, id)) {
    return NextResponse.json({ error: "Not unlocked" }, { status: 401 });
  }
  try {
    const orders = await firebaseDataSource.listOrders(id);
    return NextResponse.json(orders);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

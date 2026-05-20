import { NextResponse, type NextRequest } from "next/server";
import { firebaseDataSource } from "@/lib/data/firebaseDataSource";
import { isUnlockedRequest } from "@/lib/auth/cookies";
import type { FundraiserPatch } from "@/lib/data/dataSource";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fundraiser = await firebaseDataSource.getFundraiser(id);
  if (!fundraiser) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isUnlockedRequest(req, id)) {
    // Return safe subset for the locked landing page
    const { accessCode: _omit, ...rest } = fundraiser;
    void _omit;
    return NextResponse.json(rest);
  }
  return NextResponse.json(fundraiser);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUnlockedRequest(req, id)) {
    return NextResponse.json({ error: "Not unlocked" }, { status: 401 });
  }
  let body: FundraiserPatch;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const updated = await firebaseDataSource.updateFundraiser(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { firebaseDataSource, verifyAccessCode } from "@/lib/data/firebaseDataSource";
import { buildUnlockCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";

function masterCode(): string {
  return process.env.MASTER_ACCESS_CODE ?? "admin-2026";
}

export async function POST(req: NextRequest) {
  let body: { fundraiserId?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { fundraiserId, code } = body;
  if (!fundraiserId || typeof code !== "string") {
    return NextResponse.json({ ok: false, error: "Missing fundraiserId or code" }, { status: 400 });
  }

  const fundraiser = await firebaseDataSource.getFundraiser(fundraiserId);
  if (!fundraiser) {
    return NextResponse.json({ ok: false, error: "Unknown fundraiser" }, { status: 404 });
  }

  const ok = await verifyAccessCode(fundraiserId, code, masterCode());
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cookie = buildUnlockCookie(fundraiserId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}

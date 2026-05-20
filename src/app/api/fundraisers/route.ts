import { NextResponse } from "next/server";
import { firebaseDataSource } from "@/lib/data/firebaseDataSource";
import type { Fundraiser } from "@/lib/data/types";

export const runtime = "nodejs";
export const revalidate = 30;

function stripCode(f: Fundraiser) {
  // Don't return access codes from the public list endpoint.
  const { accessCode: _omit, ...rest } = f;
  void _omit;
  return rest;
}

export async function GET() {
  try {
    const list = await firebaseDataSource.listFundraisers();
    return NextResponse.json(list.map(stripCode));
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

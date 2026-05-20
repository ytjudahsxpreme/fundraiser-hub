import type { DataSource, FundraiserPatch } from "./dataSource";
import type { Fundraiser, StudentOrder } from "./types";

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.error ?? "";
    } catch {
      // ignore
    }
    throw new Error(`${input} failed: ${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const clientDataSource: DataSource = {
  async listFundraisers() {
    return jsonFetch<Fundraiser[]>("/api/fundraisers");
  },
  async getFundraiser(id) {
    try {
      return await jsonFetch<Fundraiser | null>(`/api/fundraisers/${encodeURIComponent(id)}`);
    } catch (err) {
      if ((err as Error).message.includes("404")) return null;
      throw err;
    }
  },
  async listOrders(fundraiserId) {
    return jsonFetch<StudentOrder[]>(`/api/orders/${encodeURIComponent(fundraiserId)}`);
  },
  async updateFundraiser(id, patch: FundraiserPatch) {
    return jsonFetch<Fundraiser>(`/api/fundraisers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
};

export async function verifyAccessCode(fundraiserId: string, code: string): Promise<boolean> {
  const res = await fetch("/api/verify-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ fundraiserId, code }),
  });
  if (res.status === 200) return true;
  if (res.status === 401) return false;
  // Other errors bubble up
  let detail = "";
  try {
    const body = await res.json();
    detail = body.error ?? "";
  } catch {
    // ignore
  }
  throw new Error(`Verify failed: ${res.status} ${detail}`);
}

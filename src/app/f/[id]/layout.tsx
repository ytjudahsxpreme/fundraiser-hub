import { notFound } from "next/navigation";
import { FundraiserShell } from "@/components/FundraiserShell";
import { firebaseDataSource } from "@/lib/data/firebaseDataSource";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FundraiserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fundraiser = await firebaseDataSource.getFundraiser(id);
  if (!fundraiser) notFound();

  // Strip access code — UI does not need it, never ships to the browser.
  const { accessCode: _omit, ...safe } = fundraiser;
  void _omit;

  return <FundraiserShell fundraiser={safe}>{children}</FundraiserShell>;
}

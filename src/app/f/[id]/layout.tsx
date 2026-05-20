import { notFound } from "next/navigation";
import { FundraiserShell } from "@/components/FundraiserShell";
import { MOCK_FUNDRAISERS } from "@/lib/data/mockData";

export default async function FundraiserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fundraiser = MOCK_FUNDRAISERS.find((f) => f.id === id);
  if (!fundraiser) notFound();

  return <FundraiserShell fundraiser={fundraiser}>{children}</FundraiserShell>;
}

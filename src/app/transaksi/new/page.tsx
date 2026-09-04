import { redirect } from "next/navigation";

export default async function TransaksiNewLegacy({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; pocket?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.type) params.set("type", sp.type);
  if (sp.pocket) params.set("pocket", sp.pocket);
  const qs = params.toString() ? `?${params.toString()}` : "";
  redirect(`/transactions/new${qs}`);
}

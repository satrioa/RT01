import { redirect } from "next/navigation";

export default async function LaporanLegacy({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams(sp as Record<string, string>).toString();
  redirect(`/reports${qs ? `?${qs}` : ""}`);
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateMonthlyReport } from "@/lib/reports/monthly-report-service";

export const dynamic = "force-dynamic";

// Vercel Cron will call this monthly on 1st at 02:00 UTC
// Protect with CRON_SECRET or Vercel's automatic header
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // if not configured, allow (dev)
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const cronHeader = req.headers.get("x-vercel-cron");
  if (cronHeader) return true; // Vercel cron
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Previous month
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = prev.getMonth() + 1;

  const supabase = createServiceClient();
  // Find all RTs
  const { data: rts, error } = await supabase.from("rt_profiles").select("id").limit(100);
  if (error) {
    console.error("[cron] fetch RTs failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rtList = (rts as { id: string }[] | null) ?? [];
  const results: { rt_id: string; status: string; error?: string }[] = [];

  for (const rt of rtList) {
    try {
      const report = await generateMonthlyReport({ rtId: rt.id, year, month });
      results.push({ rt_id: rt.id, status: report.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[cron] RT ${rt.id} failed`, msg);
      results.push({ rt_id: rt.id, status: "FAILED", error: msg });
      // continue other RTs
    }
  }

  return NextResponse.json({ ok: true, period: `${year}-${String(month).padStart(2, "0")}`, results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}

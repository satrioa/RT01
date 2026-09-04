import { NextResponse } from "next/server";
import { buildImportTemplate, templateToBuffer } from "@/lib/excel/template";

export const dynamic = "force-dynamic";

export async function GET() {
  const wb = buildImportTemplate();
  const buffer = templateToBuffer(wb);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Template-Import-RTFinance.xlsx"',
      "Content-Length": String(buffer.length),
    },
  });
}

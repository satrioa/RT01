"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { extractSheet, parseWorkbook } from "@/lib/excel/parser";
import { validateRows, type ColumnMapping } from "@/lib/excel/validator";
import { importTransactionsAction, type ImportPayloadRow } from "@/lib/actions/import";
import { useToast } from "@/components/ui/toaster";
import { formatRupiah } from "@/lib/format";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import type { Pocket, Category } from "@/types/database";

function guessMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (keywords: string[]) => {
    const idx = lower.findIndex((h) => keywords.some((k) => h.includes(k)));
    return idx >= 0 ? headers[idx] : null;
  };
  return {
    date: find(["tanggal", "date", "tgl"]),
    description: find(["keterangan", "uraian", "deskripsi", "description", "ket"]),
    income: find(["pemasukan", "income", "masuk", "debet", "kredit masuk"]),
    expense: find(["pengeluaran", "expense", "keluar", "debet keluar"]),
    amount: find(["jumlah", "nominal", "amount", "nilai"]),
    pocket: find(["kantong", "pocket", "kas", "sumber"]),
    category: find(["kategori", "category", "kat"]),
  };
}

export function ExcelImportClient({
  pockets,
  categories,
}: {
  pockets: Pocket[];
  categories: Category[];
}) {
  const { toast } = useToast();
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [workbook, setWorkbook] = React.useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = React.useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = React.useState<string | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>({
    date: null,
    description: null,
    income: null,
    expense: null,
    amount: null,
    pocket: null,
    category: null,
  });
  const [defaultPocketId, setDefaultPocketId] = React.useState<string>(pockets[0]?.id ?? "");
  const [categoryMapping, setCategoryMapping] = React.useState<Record<string, string>>({});
  const [pocketMapping, setPocketMapping] = React.useState<Record<string, string>>({});
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<{ imported: number; skipped: number; errors: { index: number; message: string }[]; errorDetails: string[] } | null>(null);

  // Derived distinct values for mapping UI
  const distinctPocketValues = React.useMemo(() => {
    if (!mapping.pocket) return [];
    const vals = new Set<string>();
    rows.forEach((r) => {
      const v = String(r[mapping.pocket!] ?? "").trim();
      if (v) vals.add(v);
    });
    return Array.from(vals);
  }, [rows, mapping.pocket]);

  const distinctCategoryValues = React.useMemo(() => {
    if (!mapping.category) return [];
    const vals = new Set<string>();
    rows.forEach((r) => {
      const v = String(r[mapping.category!] ?? "").trim();
      if (v) vals.add(v);
    });
    return Array.from(vals);
  }, [rows, mapping.category]);

  const validation = React.useMemo(() => {
    if (rows.length === 0) return [];
    return validateRows(rows, mapping, {
      pockets: pockets.map((p) => ({ id: p.id, name: p.name })),
      categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      defaultPocketId: defaultPocketId || null,
      categoryMapping,
      // pocketMapping: if user mapped excel pocket name to real pocket id, we need to translate before validation?
      // For now, validateRows checks pocket name directly; pocketMapping is applied at import stage, but we also want validation to use mapping.
      // We will inject mapping by transforming pocketMap: if pocketMapping has entry, treat excel value as mapped pocket name
    });
  }, [rows, mapping, pockets, categories, defaultPocketId, categoryMapping]);

  // If pocketMapping provided, we need to adjust validation: map excel pocket values via pocketMapping before check
  const effectiveValidation = React.useMemo(() => {
    if (Object.keys(pocketMapping).length === 0) return validation;
    // Re-validate with translated pocket names: we simulate by replacing row pocket values
    const translatedRows = rows.map((r) => {
      if (!mapping.pocket) return r;
      const raw = String(r[mapping.pocket] ?? "").trim();
      const mappedId = pocketMapping[raw];
      if (!mappedId) return r;
      const mappedPocket = pockets.find((p) => p.id === mappedId);
      if (!mappedPocket) return r;
      return { ...r, [mapping.pocket]: mappedPocket.name };
    });
    return validateRows(translatedRows, mapping, {
      pockets: pockets.map((p) => ({ id: p.id, name: p.name })),
      categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      defaultPocketId: defaultPocketId || null,
      categoryMapping,
    });
  }, [validation, pocketMapping, rows, mapping, pockets, categories, defaultPocketId, categoryMapping]);

  const validCount = effectiveValidation.filter((v) => v.isValid).length;
  const invalidCount = effectiveValidation.filter((v) => !v.isValid).length;
  const [showInvalidOnly, setShowInvalidOnly] = React.useState(false);
  const [validationExpanded, setValidationExpanded] = React.useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const buffer = await file.arrayBuffer();
    const { workbook: wb, info } = parseWorkbook(buffer);
    setWorkbook(wb);
    setSheetNames(info.sheetNames);
    const first = info.sheetNames[0] ?? null;
    setSelectedSheet(first);
    if (first) {
      const data = extractSheet(wb, first);
      setHeaders(data.headers);
      setRows(data.rows.slice(0, 500)); // limit 500 for preview/import
      const guessed = guessMapping(data.headers);
      setMapping(guessed);
    }
  }

  function handleSheetChange(sheet: string) {
    if (!workbook) return;
    setSelectedSheet(sheet);
    const data = extractSheet(workbook, sheet);
    setHeaders(data.headers);
    setRows(data.rows.slice(0, 500));
    setMapping(guessMapping(data.headers));
    setResult(null);
  }

  async function handleImport() {
    const payload: ImportPayloadRow[] = [];
    const errors: string[] = [];

    effectiveValidation.forEach((v) => {
      if (!v.isValid) return;
      const pocketName = v.parsed.pocketName!;
      // Resolve pocketId via pocketMapping or direct name
      let pocketId: string | undefined;
      if (mapping.pocket) {
        const rawPocket = String(rows[v.index][mapping.pocket] ?? "").trim();
        if (pocketMapping[rawPocket]) pocketId = pocketMapping[rawPocket];
        else pocketId = pockets.find((p) => p.name.toLowerCase() === pocketName.toLowerCase())?.id;
      } else {
        pocketId = defaultPocketId || undefined;
      }
      let categoryId: string | null | undefined = null;
      if (v.parsed.categoryName) {
        const rawCat = v.parsed.categoryName;
        if (categoryMapping[rawCat]) categoryId = categoryMapping[rawCat];
        else categoryId = categories.find((c) => c.name.toLowerCase() === rawCat.toLowerCase())?.id ?? null;
      }
      if (!pocketId) {
        errors.push(`Baris ${v.index + 1}: kantong tidak terresolve`);
        return;
      }
      if (!v.parsed.date || !v.parsed.amount || !v.parsed.type || !v.parsed.description) {
        errors.push(`Baris ${v.index + 1}: data tidak lengkap`);
        return;
      }
      payload.push({
        transaction_date: v.parsed.date,
        description: v.parsed.description,
        amount: v.parsed.amount,
        type: v.parsed.type,
        pocket_id: pocketId,
        category_id: categoryId ?? null,
      });
    });

    if (payload.length === 0) {
      toast({ title: "Tidak ada baris valid", description: "Perbaiki mapping atau data sebelum import.", variant: "error" });
      return;
    }

    setImporting(true);
    const res = await importTransactionsAction(payload);
    setImporting(false);
    setResult(res);
    if (res.imported > 0) {
      toast({ title: "Import selesai", description: `${res.imported} transaksi diimport` });
    }
    if (res.errors.length > 0) {
      toast({ title: "Beberapa baris dilewati", description: `${res.skipped} dilewati, ${res.errors.length} error`, variant: "error" });
    }
  }

  const hasMapping = mapping.date && mapping.description && (mapping.income || mapping.expense || mapping.amount);

  return (
    <div className="flex flex-col gap-4">
      {/* Template Download */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Download className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Butuh template?</p>
            <p className="text-xs text-muted-foreground">Download format resmi — tinggal isi dan upload.</p>
          </div>
          <a
            href="/api/template/import"
            download
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Download className="size-4" /> Download
          </a>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="size-4" /> Upload Excel
          </CardTitle>
          <p className="text-xs text-muted-foreground">Workflow: Upload → Sheet → Preview → Map → Validate → Import</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          {fileName && <p className="text-xs text-muted-foreground">File: {fileName} • {rows.length} baris • Sheets: {sheetNames.join(", ")}</p>}
          {sheetNames.length > 1 && (
            <div className="space-y-2">
              <Label>Pilih Sheet</Label>
              <Select value={selectedSheet ?? ""} onValueChange={handleSheetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <>
          {/* Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4" /> Preview (5 baris pertama)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {headers.map((h) => (
                      <th key={h} className="px-2 py-1 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {headers.map((h) => (
                        <td key={h} className="max-w-[120px] truncate px-2 py-1">
                          {String(r[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">Kolom terdeteksi: {headers.join(" • ")}</p>
            </CardContent>
          </Card>

          {/* Mapping */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Map Kolom</CardTitle>
              <p className="text-xs text-muted-foreground">Cocokkan kolom Excel ke field ledger. Income/Expense bisa terpisah atau satu Amount.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tanggal *</Label>
                  <Select value={mapping.date ?? "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, date: v === "__none__" ? null : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="— pilih —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— pilih —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deskripsi *</Label>
                  <Select value={mapping.description ?? "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, description: v === "__none__" ? null : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="— pilih —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— pilih —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pemasukan</Label>
                  <Select value={mapping.income ?? "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, income: v === "__none__" ? null : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="— tidak ada —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— tidak ada —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pengeluaran</Label>
                  <Select value={mapping.expense ?? "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, expense: v === "__none__" ? null : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="— tidak ada —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— tidak ada —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (alternatif)</Label>
                  <Select value={mapping.amount ?? "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, amount: v === "__none__" ? null : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="— tidak ada —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— tidak ada —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kantong</Label>
                  <Select value={mapping.pocket ?? "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, pocket: v === "__none__" ? null : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="— pakai default —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— pakai default —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Kategori</Label>
                  <Select value={mapping.category ?? "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, category: v === "__none__" ? null : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="— tanpa kategori —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— tanpa kategori —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Kantong default (jika Excel tanpa kolom kantong)</Label>
                <Select value={defaultPocketId} onValueChange={setDefaultPocketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kantong" />
                  </SelectTrigger>
                  <SelectContent>
                    {pockets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pocket mapping for distinct values */}
              {distinctPocketValues.length > 0 && (
                <div className="space-y-2">
                  <Label>Map Kantong Excel → Kantong RT</Label>
                  {distinctPocketValues.map((val) => (
                    <div key={val} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate rounded-xl border bg-muted/20 px-3 py-2 text-xs">{val}</span>
                      <span className="text-xs">→</span>
                      <Select
                        value={pocketMapping[val] ?? "__auto__"}
                        onValueChange={(v) => setPocketMapping((m) => ({ ...m, [val]: v === "__auto__" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="— auto by name —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">— auto by name —</SelectItem>
                          {pockets.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {/* Category mapping */}
              {distinctCategoryValues.length > 0 && (
                <div className="space-y-2">
                  <Label>Map Kategori Excel → Kategori RT</Label>
                  {distinctCategoryValues.map((val) => (
                    <div key={val} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate rounded-xl border bg-muted/20 px-3 py-2 text-xs">{val}</span>
                      <span className="text-xs">→</span>
                      <Select
                        value={categoryMapping[val] ?? "__auto__"}
                        onValueChange={(v) => setCategoryMapping((m) => ({ ...m, [val]: v === "__auto__" ? "" : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="— auto by name —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">— auto by name —</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {!hasMapping && <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">Pilih minimal Tanggal + Deskripsi + (Pemasukan/Pengeluaran atau Amount).</p>}
            </CardContent>
          </Card>

          {/* Validation preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Validasi</CardTitle>
              <p className="text-xs text-muted-foreground">
                {validCount} valid • {invalidCount} invalid/dup — tidak akan diimport diam-diam
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Valid</p>
                  <p className="text-lg font-bold text-success">{validCount}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Invalid</p>
                  <p className="text-lg font-bold text-destructive">{invalidCount}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{rows.length}</p>
                </div>
              </div>

              {(() => {
                const filtered = showInvalidOnly ? effectiveValidation.filter((v) => !v.isValid) : effectiveValidation;
                const sorted = showInvalidOnly ? filtered : [...filtered].sort((a, b) => Number(a.isValid) - Number(b.isValid));
                const displayList = validationExpanded ? sorted : sorted.slice(0, 20);
                return (
                  <>
                    {invalidCount > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-destructive">{invalidCount} baris invalid — perlu diperbaiki</p>
                        <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => setShowInvalidOnly((v) => !v)}>
                          {showInvalidOnly ? "Tampilkan semua" : "Hanya invalid"}
                        </Button>
                      </div>
                    )}
                    <div className={`${validationExpanded ? "max-h-[480px]" : "max-h-[240px]"} space-y-1 overflow-auto rounded-xl border p-2`}>
                      {displayList.map((v) => (
                        <div key={v.index} className={`flex items-start gap-2 rounded-xl px-2 py-1.5 ${v.isValid ? "bg-success/5" : "bg-destructive/5"}`}>
                          <span className="mt-0.5">
                            {v.isValid ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-destructive" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              Baris {v.index + 2}: {v.parsed.description ?? "—"} — {v.parsed.date ?? "no date"} — {v.parsed.amount !== null ? formatRupiah(v.parsed.amount) : "no amount"} — {v.parsed.pocketName ?? "no pocket"} — {v.parsed.categoryName ?? "no cat"}
                            </p>
                            {v.errors.length > 0 && <p className="text-xs text-destructive">{v.errors.join(" • ")}</p>}
                            {v.warnings.length > 0 && <p className="text-xs text-warning">{v.warnings.join(" • ")}</p>}
                          </div>
                          <Badge variant={v.isValid ? "success" : "destructive"} className="shrink-0 rounded-full text-xs">
                            {v.isValid ? "ok" : "err"}
                          </Badge>
                        </div>
                      ))}
                      {filtered.length === 0 && showInvalidOnly && (
                        <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada baris invalid pada filter ini.</p>
                      )}
                    </div>
                    {sorted.length > 20 && (
                      <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs" onClick={() => setValidationExpanded((v) => !v)}>
                        {validationExpanded ? "Tampilkan lebih sedikit" : `+ ${sorted.length - 20} baris lagi — tampilkan semua`}
                      </Button>
                    )}
                  </>
                );
              })()}

              <Button onClick={handleImport} disabled={!hasMapping || validCount === 0 || importing} className="w-full rounded-xl">
                {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Import {validCount} baris valid ke ledger
              </Button>
              <p className="text-center text-xs text-muted-foreground">Semua transaksi masuk ke ledger yang sama — tidak buat tabel per bulan.</p>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card className={result.errors.length ? "border-warning/30" : "border-success/30"}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {result.errors.length === 0 ? <CheckCircle2 className="size-4 text-success" /> : <AlertTriangle className="size-4 text-warning" />}
                  Hasil Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border bg-success/10 p-3">
                    <p className="text-xs text-muted-foreground">Imported</p>
                    <p className="text-lg font-bold text-success">{result.imported}</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Skipped</p>
                    <p className="text-lg font-bold">{result.skipped}</p>
                  </div>
                  <div className="rounded-xl border bg-destructive/10 p-3">
                    <p className="text-xs text-muted-foreground">Errors</p>
                    <p className="text-lg font-bold text-destructive">{result.errors.length}</p>
                  </div>
                </div>
                {result.errorDetails.length > 0 && (
                  <div className="max-h-[160px] space-y-1 overflow-auto rounded-xl border p-2">
                    {result.errorDetails.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">
                        {e}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

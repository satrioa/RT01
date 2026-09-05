import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "monthly-reports";

async function ensureBucket() {
  const supabase = createServiceClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: { name: string }) => b.name === BUCKET);
  if (!exists) {
    // try to create private bucket
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error && !String(error.message).includes("already exists")) {
      console.warn("[storage] createBucket failed", error.message);
    }
  }
}

export async function uploadReportFile(path: string, buffer: Buffer | Uint8Array, contentType: string): Promise<string> {
  const supabase = createServiceClient();
  await ensureBucket();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  // Return storage path (not public url) — we store path, generate signed url on demand
  return path;
}

export async function getReportFileUrl(path: string, expiresIn = 60 * 60 * 24 * 7): Promise<string> {
  if (!path) return "";
  // If path already looks like https URL, return as is
  if (path.startsWith("http")) return path;
  const supabase = createServiceClient();
  // Try signed url (for private bucket)
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (!error && data?.signedUrl) return data.signedUrl;
  // Fallback to public url
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

export async function getReportFileBuffer(path: string): Promise<Uint8Array | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const buf = await data.arrayBuffer();
  return new Uint8Array(buf);
}

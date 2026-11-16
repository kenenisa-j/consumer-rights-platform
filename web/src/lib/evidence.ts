// Sends one evidence file to a complaint. The file is the request body (no multipart), so the API can check its first bytes.
export interface Stored { id: string; name: string; type: string; size: number; shared: boolean }
export type UploadResult = { ok: true; file: Stored } | { ok: false; error: string };

export async function uploadEvidence(reference: string, file: File, shared: boolean): Promise<UploadResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 120_000);
  try {
    const res = await fetch(`/api/complaints/${reference}/evidence?name=${encodeURIComponent(file.name)}&shared=${shared ? 1 : 0}`, {
      method: "POST", body: file, credentials: "same-origin", signal: ctl.signal, headers: { "Content-Type": file.type || "application/octet-stream" }
    });
    const json = await res.json().catch(() => null) as { ok?: boolean; data?: Stored; error?: { message?: string } } | null;
    if (res.ok && json?.ok && json.data) return { ok: true, file: json.data };
    return { ok: false, error: json?.error?.message ?? (res.status === 413 ? "The file is too large." : "The file could not be uploaded.") };
  } catch {
    return { ok: false, error: "The connection dropped while uploading." };
  } finally { clearTimeout(timer); }
}

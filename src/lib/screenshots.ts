import { supabase } from "@/integrations/supabase/client";

export type Screenshot = {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
};

export type ScreenshotWithUrl = Screenshot & { url: string | null };

const BUCKET = "screenshots";

export async function listScreenshots(): Promise<ScreenshotWithUrl[]> {
  const { data, error } = await supabase
    .from("screenshots")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Screenshot[];
  if (rows.length === 0) return [];

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      60 * 60,
    );
  if (signErr) throw signErr;

  const byPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  return rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? null }));
}

function readDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function uploadScreenshot(file: File) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("You need to be signed in to upload.");
  const userId = userData.user.id;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  const { width, height } = await readDimensions(file);

  const { error: insErr } = await supabase.from("screenshots").insert({
    user_id: userId,
    title: file.name.replace(/\.[^.]+$/, "") || "Untitled screenshot",
    storage_path: path,
    width,
    height,
    size_bytes: file.size,
  });
  if (insErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insErr;
  }
}

export async function deleteScreenshot(shot: Screenshot) {
  const { error } = await supabase.from("screenshots").delete().eq("id", shot.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([shot.storage_path]);
}

export async function downloadScreenshot(shot: ScreenshotWithUrl) {
  const { data, error } = await supabase.storage.from(BUCKET).download(shot.storage_path);
  if (error) throw error;
  const blobUrl = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${shot.title || "screenshot"}.${shot.storage_path.split(".").pop() ?? "png"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

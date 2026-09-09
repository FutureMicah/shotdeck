import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MAX_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

const titleSchema = z.string().trim().min(1).max(160);

function json(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  }
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/webp") {
    return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) return json("A Bearer token is required.", 401);
        const token = authorization.slice(7).trim();
        if (!/^shotdeck_[A-Za-z0-9_-]{40,}$/.test(token)) return json("Invalid token.", 401);

        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (declaredLength > MAX_BYTES + 1024 * 64) return json("Image exceeds the 20 MB limit.", 413);

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
          return json("Use multipart/form-data with an image field named file.", 415);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tokenHash = await sha256(token);
        const now = new Date().toISOString();
        const { data: storedToken, error: tokenError } = await supabaseAdmin
          .from("ingestion_tokens")
          .select("id,owner_id,expires_at,user_roles!inner(role)")
          .eq("token_hash", tokenHash)
          .is("revoked_at", null)
          .eq("user_roles.role", "admin")
          .maybeSingle();
        if (tokenError || !storedToken || (storedToken.expires_at && storedToken.expires_at <= now)) {
          return json("Invalid or revoked token.", 401);
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json("Malformed multipart form data.", 400);
        }
        const file = form.get("file");
        if (!(file instanceof File)) return json("Add one image in the file field.", 400);
        if (file.size === 0) return json("The uploaded image is empty.", 400);
        if (file.size > MAX_BYTES) return json("Image exceeds the 20 MB limit.", 413);
        const extension = allowedTypes.get(file.type.toLowerCase());
        if (!extension) return json("Only PNG, JPEG, and WEBP images are accepted.", 415);
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!hasValidSignature(bytes, file.type.toLowerCase())) return json("The file contents do not match its image type.", 415);

        const requestedTitle = form.get("title");
        const fallbackTitle = file.name.replace(/\.[^.]+$/, "") || "External capture";
        const parsedTitle = titleSchema.safeParse(typeof requestedTitle === "string" && requestedTitle.trim() ? requestedTitle : fallbackTitle);
        if (!parsedTitle.success) return json("Title must be between 1 and 160 characters.", 422);

        const id = crypto.randomUUID();
        const storagePath = `${storedToken.owner_id}/${id}.${extension}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("screenshots")
          .upload(storagePath, bytes, { contentType: file.type, upsert: false });
        if (uploadError) return json("Could not store the image.", 500);

        const { error: insertError } = await supabaseAdmin.from("screenshots").insert({
          id,
          user_id: storedToken.owner_id,
          title: parsedTitle.data,
          storage_path: storagePath,
          size_bytes: file.size,
        });
        if (insertError) {
          await supabaseAdmin.storage.from("screenshots").remove([storagePath]);
          return json("Could not add the image to the private deck.", 500);
        }

        await supabaseAdmin
          .from("ingestion_tokens")
          .update({ last_used_at: now })
          .eq("id", storedToken.id);
        return Response.json({ id, title: parsedTitle.data, created: true }, { status: 201 });
      },
    },
  },
});
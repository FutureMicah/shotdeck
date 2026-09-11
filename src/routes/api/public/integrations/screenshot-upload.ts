import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MAX_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
]);

const titleSchema = z.string().trim().min(1).max(160);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: corsHeaders });
}

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  }
  return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}

export const Route = createFileRoute("/api/public/integrations/screenshot-upload")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
          return json(
            { status: "error", error: "Use multipart/form-data with an image field named file." },
            415,
          );
        }

        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (declaredLength > MAX_BYTES + 1024 * 64) {
          return json({ status: "error", error: "Image exceeds the 20 MB limit." }, 413);
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ status: "error", error: "Malformed multipart form data." }, 400);
        }

        const file = form.get("file");
        if (!(file instanceof File)) {
          return json({ status: "error", error: "Add one image in the file field." }, 400);
        }
        if (file.size === 0) return json({ status: "error", error: "The uploaded image is empty." }, 400);
        if (file.size > MAX_BYTES) return json({ status: "error", error: "Image exceeds the 20 MB limit." }, 413);

        const mime = file.type.toLowerCase();
        const extension = allowedTypes.get(mime);
        if (!extension) {
          return json({ status: "error", error: "Only PNG and JPG images are accepted." }, 415);
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!hasValidSignature(bytes, mime === "image/jpg" ? "image/jpeg" : mime)) {
          return json({ status: "error", error: "The file contents do not match its image type." }, 415);
        }

        const requestedTitle = form.get("title");
        const fallbackTitle = file.name.replace(/\.[^.]+$/, "") || "External capture";
        const parsedTitle = titleSchema.safeParse(
          typeof requestedTitle === "string" && requestedTitle.trim() ? requestedTitle : fallbackTitle,
        );
        if (!parsedTitle.success) {
          return json({ status: "error", error: "Title must be between 1 and 160 characters." }, 422);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: admin, error: adminError } = await supabaseAdmin
          .from("user_roles")
          .select("user_id,created_at")
          .eq("role", "admin")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (adminError || !admin) {
          return json(
            { status: "error", error: "No administrator account exists yet. Sign up first." },
            503,
          );
        }

        const id = crypto.randomUUID();
        const storagePath = `${admin.user_id}/${id}.${extension}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("screenshots")
          .upload(storagePath, bytes, { contentType: mime === "image/jpg" ? "image/jpeg" : mime, upsert: false });
        if (uploadError) return json({ status: "error", error: "Could not store the image." }, 500);

        const { error: insertError } = await supabaseAdmin.from("screenshots").insert({
          id,
          user_id: admin.user_id,
          title: parsedTitle.data,
          storage_path: storagePath,
          size_bytes: file.size,
        });
        if (insertError) {
          await supabaseAdmin.storage.from("screenshots").remove([storagePath]);
          return json({ status: "error", error: "Could not add the image to the deck." }, 500);
        }

        return json({ status: "ok", id, title: parsedTitle.data }, 201);
      },
    },
  },
});

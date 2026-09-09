import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenNameSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const tokenIdSchema = z.object({
  id: z.string().uuid(),
});

export type IngestionTokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createOpaqueToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `shotdeck_${secret}`;
}

async function requireAdmin(context: {
  supabase: {
    rpc: (name: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null; error: unknown }>;
  };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Administrator access is required.");
}

export const listIngestionTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IngestionTokenSummary[]> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ingestion_tokens")
      .select("id,name,token_prefix,created_at,last_used_at,expires_at,revoked_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((token) => ({
      id: token.id,
      name: token.name,
      tokenPrefix: token.token_prefix,
      createdAt: token.created_at,
      lastUsedAt: token.last_used_at,
      expiresAt: token.expires_at,
      revokedAt: token.revoked_at,
    }));
  });

export const createIngestionToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => tokenNameSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const token = createOpaqueToken();
    const tokenHash = await sha256(token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("ingestion_tokens")
      .insert({
        owner_id: context.userId,
        name: data.name,
        token_prefix: `${token.slice(0, 16)}…`,
        token_hash: tokenHash,
      })
      .select("id,name,token_prefix,created_at")
      .single();
    if (error) throw error;
    return { token, id: created.id, name: created.name, createdAt: created.created_at };
  });

export const revokeIngestionToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => tokenIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ingestion_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .is("revoked_at", null);
    if (error) throw error;
    return { ok: true };
  });
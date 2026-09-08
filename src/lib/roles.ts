import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";

/**
 * Assigns the signed-in account its role exactly once.
 * The database decides: the very first account becomes "admin",
 * every later account becomes "user". Clients cannot influence this.
 */
export async function ensureMyRole(): Promise<AppRole | null> {
  const { data, error } = await supabase.rpc("ensure_my_role");
  if (error) return null;
  return (data as AppRole | null) ?? null;
}

export async function getMyRole(): Promise<AppRole> {
  const assigned = await ensureMyRole();
  if (assigned) return assigned;
  const { data } = await supabase.from("user_roles").select("role").limit(1).maybeSingle();
  return ((data?.role as AppRole | undefined) ?? "user") as AppRole;
}

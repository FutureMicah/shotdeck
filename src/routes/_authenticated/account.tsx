import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes, listScreenshots } from "@/lib/screenshots";
import { getMyRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Shotdeck" },
      {
        name: "description",
        content: "See your account, how much storage your screenshots use, and sign out safely.",
      },
      { property: "og:title", content: "Account — Shotdeck" },
      { property: "og:description", content: "Manage your private Shotdeck account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const { data: shots } = useQuery({ queryKey: ["screenshots"], queryFn: listScreenshots });
  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: getMyRole });

  const total = (shots ?? []).reduce((sum, s) => sum + (s.size_bytes ?? 0), 0);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Account">
      <div className="max-w-2xl space-y-4">
        <div className="glass rounded-3xl border border-border/60 p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{user?.email ?? "—"}</p>
            {role ? (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  role === "admin"
                    ? "bg-primary/20 text-primary"
                    : "bg-white/10 text-muted-foreground"
                }`}
              >
                {role === "admin" ? "Administrator" : "Member"}
              </span>
            ) : null}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Stat label="Screenshots" value={String(shots?.length ?? 0)} />
            <Stat label="Storage used" value={formatBytes(total)} />
          </div>
        </div>

        <div className="glass flex gap-3 rounded-3xl border border-border/60 p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every screenshot is stored in a private area tied to your account. Viewing, downloading
            and deleting are all checked against your login, so nobody else can reach your files.
          </p>
        </div>

        <button
          onClick={signOut}
          className="glass flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-white/10"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

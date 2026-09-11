import { Link, useNavigate } from "@tanstack/react-router";
import { Images, Upload, UserRound, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/shots", label: "Library", icon: Images },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/account", label: "Account", icon: UserRound },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="dotted-field pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-accent/15 blur-[140px]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
        <aside className="glass sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-border/60 p-6 md:flex">
          <div>
            <p className="text-lg font-semibold tracking-tight">Shotdeck</p>
            <p className="mt-1 text-xs text-muted-foreground">Private screenshot review</p>
            <nav className="mt-8 space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeProps={{ className: "bg-white/10 text-foreground" }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </aside>

        <main className="flex-1 px-4 pb-32 pt-8 md:px-10 md:pb-12">
          <header className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[2.1rem] font-semibold leading-none tracking-[-0.03em] md:text-4xl">
                {title}
              </h1>
              {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
          </header>
          {children}
        </main>
      </div>

      <nav className="glass fixed bottom-5 left-1/2 z-40 flex w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-around rounded-full border border-white/15 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "bg-white/15 text-foreground" }}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-full px-2 py-2.5 text-[11px] text-muted-foreground transition-colors",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

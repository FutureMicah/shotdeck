import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Trash2, Maximize2, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  deleteScreenshot,
  downloadScreenshot,
  formatBytes,
  listScreenshots,
  type ScreenshotWithUrl,
} from "@/lib/screenshots";

export const Route = createFileRoute("/_authenticated/shots")({
  head: () => ({
    meta: [
      { title: "Your screenshot deck — Shotdeck" },
      {
        name: "description",
        content: "Scroll, open full-screen, download or delete the screenshots in your private deck.",
      },
      { property: "og:title", content: "Your screenshot deck — Shotdeck" },
      {
        property: "og:description",
        content: "A private, scrollable review deck of your own screenshots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShotsPage,
});

function ShotsPage() {
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<ScreenshotWithUrl | null>(null);
  const [confirming, setConfirming] = useState<ScreenshotWithUrl | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["screenshots"],
    queryFn: listScreenshots,
  });

  const remove = useMutation({
    mutationFn: deleteScreenshot,
    onSuccess: () => {
      toast.success("Screenshot deleted");
      setConfirming(null);
      setViewing(null);
      queryClient.invalidateQueries({ queryKey: ["screenshots"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not delete that screenshot"),
  });

  const shots = data ?? [];

  return (
    <AppShell
      title="Your deck"
      subtitle={shots.length ? `${shots.length} capture${shots.length === 1 ? "" : "s"}` : undefined}
    >
      {isLoading ? (
        <div className="space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="h-[26rem] animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <p className="glass rounded-2xl border border-destructive/40 p-5 text-sm text-muted-foreground">
          We couldn't load your screenshots. Pull down and try again.
        </p>
      ) : shots.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          {shots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              onOpen={() => setViewing(shot)}
              onDelete={() => setConfirming(shot)}
            />
          ))}
        </div>
      )}

      {viewing ? <Viewer shot={viewing} onClose={() => setViewing(null)} /> : null}

      {confirming ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="glass w-full max-w-sm rounded-3xl border border-border/60 p-6">
            <h2 className="text-lg font-semibold">Delete this screenshot?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              “{confirming.title}” and its file will be permanently removed from your account. This
              can't be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 rounded-xl border border-border/70 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10"
              >
                Keep it
              </button>
              <button
                disabled={remove.isPending}
                onClick={() => remove.mutate(confirming)}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {remove.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function ShotCard({
  shot,
  onOpen,
  onDelete,
}: {
  shot: ScreenshotWithUrl;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className="group relative h-[30rem] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_80px_-40px_rgba(0,0,0,1)]"
      style={
        shot.url
          ? { backgroundImage: `url(${shot.url})`, backgroundSize: "cover", backgroundPosition: "top center" }
          : undefined
      }
    >
      <button
        onClick={onOpen}
        aria-label={`Open ${shot.title} full screen`}
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/45"
      />

      <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3">
        <span className="glass rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-medium">
          {new Date(shot.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <div className="pointer-events-auto flex gap-2">
          <IconButton
            label="Download"
            onClick={() =>
              downloadScreenshot(shot).catch(() => toast.error("Download failed. Try again."))
            }
          >
            <Download className="size-4" />
          </IconButton>
          <IconButton label="Delete" destructive onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-5 bottom-5">
        <h2 className="truncate text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)]">
          {shot.title}
        </h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-white/70">
            {shot.width && shot.height ? `${shot.width}×${shot.height} · ` : ""}
            {formatBytes(shot.size_bytes)}
          </p>
          <div className="pointer-events-auto">
            <IconButton label="Open full screen" onClick={onOpen}>
              <Maximize2 className="size-4" />
            </IconButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function IconButton({
  label,
  children,
  onClick,
  destructive,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur transition-colors hover:bg-white/20 ${
        destructive ? "text-destructive hover:bg-destructive/20" : ""
      }`}
    >
      {children}
    </button>
  );
}

function Viewer({ shot, onClose }: { shot: ScreenshotWithUrl; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-4">
        <p className="truncate pr-4 text-sm font-medium text-white">{shot.title}</p>
        <div className="flex gap-2">
          <IconButton
            label="Download"
            onClick={() =>
              downloadScreenshot(shot).catch(() => toast.error("Download failed. Try again."))
            }
          >
            <Download className="size-4" />
          </IconButton>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 pb-6">
        {shot.url ? (
          <img
            src={shot.url}
            alt={shot.title}
            className="mx-auto w-full max-w-3xl rounded-2xl object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass flex flex-col items-center rounded-3xl border border-dashed border-border/70 px-6 py-16 text-center">
      <div className="rounded-2xl border border-border/60 bg-white/5 p-4">
        <ImagePlus className="size-7 text-primary" />
      </div>
      <h2 className="mt-6 text-lg font-semibold">Your deck is empty</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Add your first capture and it will appear here as a full-bleed card you can scroll, open
        full-screen, download or delete.
      </p>
      <Link
        to="/upload"
        className="mt-7 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Upload a screenshot
      </Link>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { uploadScreenshot } from "@/lib/screenshots";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a screenshot — Shotdeck" },
      {
        name: "description",
        content: "Add a screenshot to your private deck. Only your account can open or delete it.",
      },
      { property: "og:title", content: "Upload a screenshot — Shotdeck" },
      {
        property: "og:description",
        content: "Add a capture to your private, account-protected screenshot deck.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = useMutation({
    mutationFn: async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
        await uploadScreenshot(file);
      }
    },
    onSuccess: () => {
      toast.success("Added to your deck");
      queryClient.invalidateQueries({ queryKey: ["screenshots"] });
      navigate({ to: "/shots" });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Upload failed. Try again."),
  });

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!consent) {
      toast.error("Please confirm the upload notice first.");
      return;
    }
    upload.mutate(files);
  }

  return (
    <AppShell title="Upload" subtitle="Images up to 20 MB each">
      <div className="glass max-w-2xl rounded-3xl border border-border/60 p-6">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/5 p-4">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 accent-[oklch(0.72_0.16_268)]"
          />
          <span className="text-sm leading-relaxed text-muted-foreground">
            I'm uploading screenshots I have the right to store, and I understand they'll be kept
            privately in my account until I delete them. Please avoid uploading other people's
            personal or confidential information.
          </span>
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          onClick={() => (consent ? inputRef.current?.click() : toast.error("Please confirm the upload notice first."))}
          className={`mt-5 flex cursor-pointer flex-col items-center rounded-3xl border border-dashed px-6 py-14 text-center transition-colors ${
            dragging ? "border-primary bg-primary/10" : "border-border/70 hover:bg-white/5"
          } ${consent ? "" : "opacity-60"}`}
        >
          <UploadCloud className="size-7 text-primary" />
          <p className="mt-4 text-sm font-medium">
            {upload.isPending ? "Uploading…" : "Tap to choose a screenshot"}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">or drop an image here (PNG, JPG, WEBP)</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}

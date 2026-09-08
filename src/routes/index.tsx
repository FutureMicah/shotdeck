import { createFileRoute, Link } from "@tanstack/react-router";
import { Images, ShieldCheck, Download } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shotdeck — private screenshot review dashboard" },
      {
        name: "description",
        content:
          "Upload, scroll and review your screenshots full-screen in a private dashboard. Only you can see, download or delete your own uploads.",
      },
      { property: "og:title", content: "Shotdeck — private screenshot review" },
      {
        property: "og:description",
        content:
          "A mobile-first, glassy dashboard for reviewing your screenshots. Private by account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Images,
    title: "Scroll your captures",
    body: "Tall, full-bleed cards show every screenshot as its own backdrop. Tap to open it full-screen.",
  },
  {
    icon: ShieldCheck,
    title: "Private by account",
    body: "Uploads live in your own protected space. Every view, download and delete is checked against your account.",
  },
  {
    icon: Download,
    title: "Download or remove",
    body: "Keep a copy on your device, or delete a capture and its file for good — in one tap.",
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/5 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-[140px]" />
      </div>

      <main className="mx-auto flex max-w-5xl flex-col px-5 py-16 md:py-28">
        <span className="glass w-fit rounded-full border border-border/60 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Shotdeck
        </span>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
          Review your screenshots the way you captured them.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          A dark, glassy review deck built for the phone first. Upload a capture, scroll the stack,
          open it full-screen, download it or wipe it — all inside your own private account.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
          <Link
            to="/shots"
            className="glass rounded-xl border border-border/60 px-6 py-3 text-sm font-medium transition-colors hover:bg-white/10"
          >
            Open my deck
          </Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl border border-border/60 p-5">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-sm font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

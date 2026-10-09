import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Link2, MessageSquareWarning } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { LEVEL_META, RiskBadge } from "@/components/risk";
import type { RiskLevel } from "@/lib/engine/types";
import { historyStats, useHistory } from "@/services/history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberShield AI — Phishing & Scam Detector" },
      { name: "description", content: "Check suspicious links and messages for phishing and scams, with clear evidence and advice." },
      { property: "og:title", content: "CyberShield AI — Phishing & Scam Detector" },
      { property: "og:description", content: "Check suspicious links and messages for phishing and scams, with clear evidence and advice." },
    ],
  }),
  component: Dashboard,
});

const LEVELS: RiskLevel[] = ["low", "moderate", "high", "critical"];

function Dashboard() {
  const records = useHistory();
  const stats = historyStats(records);

  return (
    <>
      <PageHeader eyebrow="Dashboard" title="Is this a scam?">
        Check a link or message before you click, pay or reply. Every result shows the evidence and what to do next.
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { to: "/url" as const, icon: Link2, title: "Scan a link", body: "Spot fake bank pages, look-alike domains and hidden destinations." },
          { to: "/message" as const, icon: MessageSquareWarning, title: "Analyse a message", body: "Detect OTP theft, KYC, UPI, job and investment scams." },
        ].map(({ to, icon: Icon, title, body }) => (
          <Link key={to} to={to} className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-glow">
            <Icon aria-hidden="true" className="mb-3 size-6 text-primary" />
            <h2 className="flex items-center gap-2 text-lg font-semibold">{title}<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /></h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </Link>
        ))}
      </div>

      <section aria-labelledby="stats-heading" className="mt-10">
        <h2 id="stats-heading" className="mb-1 text-xl font-semibold">Your scans on this device</h2>
        <p className="mb-4 text-xs text-muted-foreground">Counts come only from scans you ran in this browser.</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEVELS.map((l) => (
            <div key={l} className="rounded-lg border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{LEVEL_META[l].label}</dt>
              <dd className={`font-display text-3xl font-bold ${LEVEL_META[l].text}`}>{stats.byLevel[l]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="recent-heading" className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-heading" className="text-xl font-semibold">Recent scans</h2>
          {records.length > 0 && <Link to="/history" className="text-sm text-primary underline-offset-4 hover:underline">View all</Link>}
        </div>
        {records.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No scans yet. Start with a link or message above.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {records.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-3">
                <span className="min-w-0 truncate font-mono text-sm"><span className="sr-only">{r.type}: </span>{r.preview}</span>
                <RiskBadge level={r.level} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

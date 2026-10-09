import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchHealth } from "@/services/api";
import { clearHistory, updateSettings, useHistory, useSettings } from "@/services/history";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Privacy — CyberShield AI" },
      {
        name: "description",
        content: "Control what is saved and see which services are used for analysis.",
      },
      { property: "og:title", content: "Settings & Privacy — CyberShield AI" },
      {
        property: "og:description",
        content: "Control what is saved and see which services are used for analysis.",
      },
    ],
  }),
  component: SettingsPage,
});

type Health = { state: "loading" } | { state: "ok"; provider: string } | { state: "error" };

function SettingsPage() {
  const settings = useSettings();
  const records = useHistory();
  const [health, setHealth] = useState<Health>({ state: "loading" });

  useEffect(() => {
    fetchHealth()
      .then((h) => setHealth({ state: "ok", provider: h.reputationProvider }))
      .catch(() => setHealth({ state: "error" }));
  }, []);

  return (
    <>
      <PageHeader eyebrow="Configure" title="Settings & Privacy" />
      <div className="space-y-6">
        <section aria-labelledby="s-history" className="rounded-xl border bg-card p-5">
          <h2 id="s-history" className="mb-4 text-lg font-semibold">
            History
          </h2>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="save-history" className="text-sm">
              Save scans in this browser
            </Label>
            <Switch
              id="save-history"
              checked={settings.saveHistory}
              onCheckedChange={(v) => updateSettings({ saveHistory: v })}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {records.length} saved scan{records.length === 1 ? "" : "s"}
            </p>
            <Button variant="outline" disabled={records.length === 0} onClick={clearHistory}>
              Delete all history
            </Button>
          </div>
        </section>

        <section aria-labelledby="s-service" className="rounded-xl border bg-card p-5">
          <h2 id="s-service" className="mb-2 text-lg font-semibold">
            Analysis service
          </h2>
          <p aria-live="polite" className="text-sm">
            {health.state === "loading" && "Checking service status…"}
            {health.state === "error" && "The analysis service is not reachable right now."}
            {health.state === "ok" &&
              `Online. Reputation provider: ${health.provider === "none" ? "not configured (structural checks only)" : "Google Safe Browsing"}.`}
          </p>
        </section>

        <section aria-labelledby="s-privacy" className="rounded-xl border bg-card p-5">
          <h2 id="s-privacy" className="mb-2 text-lg font-semibold">
            What happens to your data
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Text you submit is analysed on our server by fixed rules and is not stored or logged
              there.
            </li>
            <li>Links are never opened, fetched or followed.</li>
            <li>
              If a reputation provider is configured, only the link (never message text) is sent to
              Google Safe Browsing.
            </li>
            <li>No AI service receives your content.</li>
            <li>
              History is kept only in this browser; message scans keep a 140-character preview.
            </li>
            <li>
              We will never ask for your passwords, PINs or OTPs — remove them before pasting.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}

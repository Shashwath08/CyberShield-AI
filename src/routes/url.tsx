import { createFileRoute } from "@tanstack/react-router";
import { Link2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ScanStatus } from "@/components/ScanStatus";
import { useAnalysis } from "@/components/useAnalysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIMITS } from "@/lib/engine/types";
import { analyzeUrlRequest } from "@/services/api";

export const Route = createFileRoute("/url")({
  head: () => ({
    meta: [
      { title: "URL Scanner — CyberShield AI" },
      {
        name: "description",
        content: "Check a suspicious link for phishing tricks without ever opening it.",
      },
      { property: "og:title", content: "URL Scanner — CyberShield AI" },
      {
        property: "og:description",
        content: "Check a suspicious link for phishing tricks without ever opening it.",
      },
    ],
  }),
  component: UrlScannerPage,
});

export function UrlScannerPage() {
  const [url, setUrl] = useState("");
  const { state, run } = useAnalysis(analyzeUrlRequest);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(url);
  };

  return (
    <>
      <PageHeader eyebrow="Analyse" title="URL Scanner">
        Paste a link you received. We inspect its structure only — the site is never visited.
      </PageHeader>
      <form onSubmit={onSubmit} className="mb-8 space-y-3" noValidate>
        <Label htmlFor="url-input">Link to check</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="url-input"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://example.com/login"
            value={url}
            maxLength={LIMITS.urlMaxLength}
            onChange={(e) => setUrl(e.target.value)}
            aria-describedby="url-help"
            className="h-11 font-mono"
          />
          <Button
            type="submit"
            size="lg"
            className="h-11"
            disabled={state.status === "loading" || !url.trim()}
          >
            <Link2 aria-hidden="true" /> Analyse link
          </Button>
        </div>
        <p id="url-help" className="text-xs text-muted-foreground">
          Only http and https links. Max {LIMITS.urlMaxLength} characters.
        </p>
      </form>
      <ScanStatus state={state} />
    </>
  );
}

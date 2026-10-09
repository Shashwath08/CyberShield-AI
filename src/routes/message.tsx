import { createFileRoute } from "@tanstack/react-router";
import { ScanText } from "lucide-react";
import { useState, type FormEvent } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ScanStatus } from "@/components/ScanStatus";
import { useAnalysis } from "@/components/useAnalysis";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LIMITS } from "@/lib/engine/types";
import { analyzeMessageRequest } from "@/services/api";

export const Route = createFileRoute("/message")({
  head: () => ({
    meta: [
      { title: "Message Analyzer — CyberShield AI" },
      {
        name: "description",
        content:
          "Paste an SMS, email or WhatsApp message to spot OTP, KYC, UPI and phishing scams.",
      },
      { property: "og:title", content: "Message Analyzer — CyberShield AI" },
      {
        property: "og:description",
        content:
          "Paste an SMS, email or WhatsApp message to spot OTP, KYC, UPI and phishing scams.",
      },
    ],
  }),
  component: MessageAnalyzerPage,
});

export function MessageAnalyzerPage() {
  const [text, setText] = useState("");
  const { state, run } = useAnalysis(analyzeMessageRequest);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(text);
  };

  return (
    <>
      <PageHeader eyebrow="Analyse" title="Message Analyzer">
        Paste an SMS, email, WhatsApp, banking, UPI, job or investment message. Remove any real OTPs
        or passwords first.
      </PageHeader>
      <form onSubmit={onSubmit} className="mb-8 space-y-3" noValidate>
        <Label htmlFor="message-input">Message text</Label>
        <Textarea
          id="message-input"
          name="message"
          rows={7}
          value={text}
          maxLength={LIMITS.messageMaxLength}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="message-help"
          className="font-mono text-sm"
          placeholder="Dear customer, your account will be blocked today. Update KYC at…"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id="message-help" className="text-xs text-muted-foreground">
            {text.length}/{LIMITS.messageMaxLength} characters. Analysed with rules only — not sent
            to any AI service.
          </p>
          <Button
            type="submit"
            size="lg"
            className="h-11"
            disabled={state.status === "loading" || !text.trim()}
          >
            <ScanText aria-hidden="true" /> Analyse message
          </Button>
        </div>
      </form>
      <ScanStatus state={state} />
    </>
  );
}

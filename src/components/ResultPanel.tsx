import { Info, ListChecks, Search, ShieldQuestion } from "lucide-react";
import { memo, useMemo, type ReactNode } from "react";

import type { AnalysisResult, Indicator } from "@/lib/engine/types";

import { KIND_LABEL, RiskBadge, RiskGauge } from "./risk";

/** Renders text with suspicious spans wrapped in <mark>. Never uses raw HTML. */
export function HighlightedText({
  text,
  indicators,
}: {
  text: string;
  indicators: readonly Indicator[];
}) {
  const parts = useMemo(() => {
    const spans = indicators
      .flatMap((i) => (i.span && i.span.end <= text.length ? [{ ...i.span, title: i.title }] : []))
      .sort((a, b) => a.start - b.start);
    const out: ReactNode[] = [];
    let cursor = 0;
    for (const s of spans) {
      if (s.start < cursor) continue;
      if (s.start > cursor) out.push(text.slice(cursor, s.start));
      out.push(
        <mark key={`${s.start}-${s.end}`} title={s.title}>
          {text.slice(s.start, s.end)}
          <span className="sr-only"> (flagged: {s.title})</span>
        </mark>,
      );
      cursor = s.end;
    }
    out.push(text.slice(cursor));
    return out;
  }, [text, indicators]);
  return (
    <p className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">{parts}</p>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export const ResultPanel = memo(function ResultPanel({ result }: { result: AnalysisResult }) {
  const shown = result.indicators;
  return (
    <article
      aria-labelledby="result-heading"
      className="space-y-6 rounded-xl border bg-card p-5 shadow-glow sm:p-6"
    >
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <RiskGauge score={result.score} level={result.level} />
        <div className="min-w-0 space-y-2">
          <h2 id="result-heading" className="text-xl font-bold">
            Analysis result
          </h2>
          <RiskBadge level={result.level} />
          <p className="text-sm leading-relaxed">{result.explanation}</p>
          <p className="text-xs text-muted-foreground">
            Analysed in {result.durationMs} ms · link was never opened
          </p>
        </div>
      </header>

      {result.type === "message" && (
        <Section
          icon={<Search aria-hidden="true" className="size-4 text-primary" />}
          title="Message with flagged phrases"
        >
          <div className="max-h-72 overflow-auto rounded-lg border bg-background/60 p-4">
            <HighlightedText text={result.input} indicators={shown} />
          </div>
        </Section>
      )}
      {result.type === "url" && (
        <p className="break-all rounded-lg border bg-background/60 p-3 font-mono text-sm">
          {result.input}
        </p>
      )}

      <Section
        icon={<ShieldQuestion aria-hidden="true" className="size-4 text-primary" />}
        title={`Findings (${shown.length})`}
      >
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No known warning patterns matched.</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((i) => (
              <li key={i.id} className="rounded-lg border bg-background/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{i.title}</span>
                  <span className="rounded border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {KIND_LABEL[i.kind]}
                    {i.weight > 0 ? ` · +${i.weight}` : ""}
                  </span>
                </div>
                <p className="mt-1 break-words text-sm text-muted-foreground">{i.evidence}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        icon={<ListChecks aria-hidden="true" className="size-4 text-primary" />}
        title="What you should do"
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {result.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Section>

      <Section
        icon={<Info aria-hidden="true" className="size-4 text-primary" />}
        title="Limitations"
      >
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {result.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Section>
    </article>
  );
});

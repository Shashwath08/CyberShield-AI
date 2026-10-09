import { explain, limitationsFor, recommendationsFor } from "./advice";
import { extractLinks, messageIndicators, validateMessage } from "./message";
import { levelForScore, scoreIndicators } from "./risk";
import type { ReputationOutcome } from "./reputation";
import { InputError, type AnalysisResult, type Indicator, type ScanType } from "./types";
import { parseUrl, urlIndicators } from "./url";

export type ReputationLookup = (url: string) => Promise<ReputationOutcome>;

function build(type: ScanType, input: string, indicators: Indicator[], reputationChecked: boolean, started: number): AnalysisResult {
  const score = scoreIndicators(indicators);
  const level = levelForScore(score);
  return {
    type, input, score, level, indicators,
    explanation: explain(indicators, level, score, type),
    recommendations: recommendationsFor(indicators, level, type),
    limitations: limitationsFor(type, reputationChecked),
    durationMs: Math.round((performance.now() - started) * 100) / 100,
  };
}

export async function analyzeUrl(raw: string, reputation?: ReputationLookup): Promise<AnalysisResult> {
  const started = performance.now();
  const parsed = parseUrl(raw);
  const indicators = urlIndicators(parsed, raw);
  let checked = false;
  if (reputation) {
    const outcome = await reputation(parsed.normalized);
    checked = outcome.checked;
    indicators.push(outcome.indicator);
  }
  return build("url", parsed.normalized, indicators, checked, started);
}

/** Message analysis is fully offline: embedded links get structural checks only. */
export function analyzeMessage(raw: string): AnalysisResult {
  const started = performance.now();
  const text = validateMessage(raw);
  const indicators = messageIndicators(text);

  let worst: { link: string; score: number; index: number; titles: string[] } | undefined;
  for (const link of extractLinks(text)) {
    try {
      const parsed = parseUrl(link.text);
      const found = urlIndicators(parsed, link.text);
      const score = scoreIndicators(found);
      if (!worst || score > worst.score) worst = { link: link.text, score, index: link.index, titles: found.map((f) => f.title) };
    } catch (e) {
      if (!(e instanceof InputError)) throw e;
    }
  }
  if (worst) {
    indicators.push({
      id: "embedded-link", group: "link",
      title: worst.score >= 25 ? "Contains a suspicious link" : "Contains a link",
      kind: worst.score >= 25 ? "suspicious" : "inconclusive",
      weight: Math.max(8, Math.round(worst.score * 0.7)),
      evidence: worst.titles.length ? `${worst.link} — ${worst.titles.join("; ")}.` : `${worst.link} — scam messages usually push you to a link; verify before opening.`,
      span: { start: worst.index, end: worst.index + worst.link.length },
    });
  }
  return build("message", text, indicators, false, started);
}

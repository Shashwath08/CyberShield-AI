import type { Indicator, RiskLevel } from "./types";

/** Presentation bands. Heuristic thresholds, not calibrated probabilities. */
export const RISK_BANDS: ReadonlyArray<{ level: RiskLevel; min: number }> = [
  { level: "critical", min: 75 },
  { level: "high", min: 50 },
  { level: "moderate", min: 25 },
  { level: "low", min: 0 },
];

export function levelForScore(score: number): RiskLevel {
  const clamped = clampScore(score);
  return RISK_BANDS.find((b) => clamped >= b.min)?.level ?? "low";
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Deterministic score:
 * 1. keep only the strongest indicator per correlation group (no double counting);
 * 2. combine groups as independent probabilities: 100 * (1 - Π(1 - w/100)).
 * "unavailable" indicators never add risk.
 */
export function scoreIndicators(indicators: readonly Indicator[]): number {
  const strongest = new Map<string, number>();
  for (const ind of indicators) {
    if (ind.kind === "unavailable" || ind.weight <= 0) continue;
    const w = Math.min(100, ind.weight);
    strongest.set(ind.group, Math.max(strongest.get(ind.group) ?? 0, w));
  }
  let remaining = 1;
  for (const w of strongest.values()) remaining *= 1 - w / 100;
  return clampScore(100 * (1 - remaining));
}

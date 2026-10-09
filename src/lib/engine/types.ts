/** Shared contract between the detection engine, the HTTP API and the UI. */

export type ScanType = "url" | "message";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

/**
 * How strong the evidence behind an indicator is.
 * - confirmed: a threat-intelligence provider positively flagged it
 * - suspicious: a heuristic matched a known attack pattern
 * - inconclusive: a weak signal that is common in legitimate content too
 * - unavailable: a check could not run (e.g. no reputation provider)
 */
export type EvidenceKind = "confirmed" | "suspicious" | "inconclusive" | "unavailable";

export interface TextSpan {
  start: number;
  end: number;
}

export interface Indicator {
  id: string;
  /** Correlated indicators share a group; only the strongest per group is scored. */
  group: string;
  title: string;
  evidence: string;
  kind: EvidenceKind;
  /** Contribution 0–100 before group de-duplication. */
  weight: number;
  span?: TextSpan;
}

export interface AnalysisResult {
  type: ScanType;
  /** The analysed input (normalised URL, or the message text). */
  input: string;
  score: number;
  level: RiskLevel;
  indicators: Indicator[];
  explanation: string;
  recommendations: string[];
  limitations: string[];
  durationMs: number;
}

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export const LIMITS = {
  urlMaxLength: 2048,
  messageMaxLength: 5000,
  maxLinksPerMessage: 10,
} as const;

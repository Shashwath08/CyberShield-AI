import { AlertOctagon, AlertTriangle, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";

import type { EvidenceKind, RiskLevel } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

export const LEVEL_META: Record<RiskLevel, { label: string; icon: LucideIcon; text: string; bg: string; stroke: string }> = {
  low: { label: "Low risk", icon: ShieldCheck, text: "text-risk-low", bg: "bg-risk-low/15 border-risk-low/40", stroke: "stroke-risk-low" },
  moderate: { label: "Moderate risk", icon: AlertTriangle, text: "text-risk-moderate", bg: "bg-risk-moderate/15 border-risk-moderate/40", stroke: "stroke-risk-moderate" },
  high: { label: "High risk", icon: ShieldAlert, text: "text-risk-high", bg: "bg-risk-high/15 border-risk-high/40", stroke: "stroke-risk-high" },
  critical: { label: "Critical risk", icon: AlertOctagon, text: "text-risk-critical", bg: "bg-risk-critical/15 border-risk-critical/40", stroke: "stroke-risk-critical" },
};

export const KIND_LABEL: Record<EvidenceKind, string> = {
  confirmed: "Confirmed by threat intel",
  suspicious: "Suspicious pattern",
  inconclusive: "Weak signal",
  unavailable: "Check unavailable",
};

/** Risk is always conveyed by icon + text, never colour alone. */
export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const meta = LEVEL_META[level];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", meta.bg, meta.text, className)}>
      <Icon aria-hidden="true" className="size-3.5" />
      {meta.label}
    </span>
  );
}

export function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const meta = LEVEL_META[level];
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`Risk score ${score} out of 100, ${meta.label}`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} className={cn("fill-none transition-[stroke-dashoffset] duration-700", meta.stroke)}
          strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className={cn("font-display text-4xl font-bold", meta.text)}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

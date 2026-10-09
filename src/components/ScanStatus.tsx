import { AlertCircle, Loader2 } from "lucide-react";

import type { useAnalysis } from "./useAnalysis";
import { ResultPanel } from "./ResultPanel";

type State = ReturnType<typeof useAnalysis>["state"];

/** Live region announcing loading, errors and results to screen readers. */
export function ScanStatus({ state }: { state: State }) {
  return (
    <div aria-live="polite" aria-busy={state.status === "loading"}>
      {state.status === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Analysing…
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span><strong>Could not analyse:</strong> {state.message}</span>
        </p>
      )}
      {state.status === "success" && <ResultPanel result={state.result} />}
    </div>
  );
}

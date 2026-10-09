import { useCallback, useState } from "react";

import type { AnalysisResult } from "@/lib/engine/types";
import { saveScan } from "@/services/history";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: AnalysisResult };

/** Shared submit/loading/error/result state for both scanners. */
export function useAnalysis(request: (input: string) => Promise<AnalysisResult>) {
  const [state, setState] = useState<State>({ status: "idle" });
  const run = useCallback(
    async (input: string) => {
      setState({ status: "loading" });
      try {
        const result = await request(input);
        saveScan(result);
        setState({ status: "success", result });
      } catch (e) {
        setState({ status: "error", message: e instanceof Error ? e.message : "Analysis failed." });
      }
    },
    [request],
  );
  return { state, run };
}

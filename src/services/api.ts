import type { AnalysisResult } from "@/lib/engine/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function post(path: string, body: unknown): Promise<AnalysisResult> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Could not reach the analysis service. Check your connection and try again.",
      0,
    );
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      "Analysis failed. Please try again.";
    throw new ApiError(message, res.status);
  }
  return data as AnalysisResult;
}

export const analyzeUrlRequest = (url: string) => post("/api/analyze/url", { url });
export const analyzeMessageRequest = (message: string) => post("/api/analyze/message", { message });

export async function fetchHealth(): Promise<{ status: string; reputationProvider: string }> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new ApiError("Service unavailable", res.status);
  return res.json();
}

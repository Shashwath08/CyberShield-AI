import { z } from "zod";

import { analyzeMessage, analyzeUrl } from "@/lib/engine/analyze";
import { checkReputation } from "@/lib/engine/reputation";
import { InputError, LIMITS } from "@/lib/engine/types";

const SECURITY_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
};

export const UrlRequest = z.object({ url: z.string().min(1).max(LIMITS.urlMaxLength) }).strict();
export const MessageRequest = z
  .object({
    message: z.string().min(1).max(LIMITS.messageMaxLength),
    channel: z.enum(["sms", "email", "whatsapp", "social", "other"]).optional(),
  })
  .strict();

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...SECURITY_HEADERS, ...extra } });
}

const errorBody = (code: string, message: string) => ({ error: { code, message } });

/** Fixed-window limiter. Per server instance only — see SECURITY.md. */
export class RateLimiter {
  private hits = new Map<string, { count: number; reset: number }>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now >= entry.reset) {
      if (this.hits.size > 5000) this.hits.clear(); // bound memory
      this.hits.set(key, { count: 1, reset: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}

const limiter = new RateLimiter(30, 60_000);

function clientKey(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
}

async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 20_000) throw new InputError("Request body is too large.");
  const text = await request.text();
  if (text.length > 20_000) throw new InputError("Request body is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new InputError("Request body must be valid JSON.");
  }
}

/** Centralised error handling: generic messages, no stack traces, no input echo in logs. */
async function guarded(request: Request, work: () => Promise<Response>, rl: RateLimiter = limiter): Promise<Response> {
  if (!rl.allow(clientKey(request))) return json(errorBody("rate_limited", "Too many requests. Please wait a minute."), 429, { "retry-after": "60" });
  try {
    return await work();
  } catch (err) {
    if (err instanceof InputError) return json(errorBody("invalid_input", err.message), 422);
    if (err instanceof z.ZodError) return json(errorBody("invalid_request", err.issues[0]?.message ?? "Invalid request."), 422);
    console.error("analysis failed:", err instanceof Error ? err.name : "unknown");
    return json(errorBody("internal_error", "Something went wrong while analysing. Please try again."), 500);
  }
}

export interface ApiDeps {
  safeBrowsingKey?: string;
  fetchImpl?: typeof fetch;
  rateLimiter?: RateLimiter;
}

export function handleAnalyzeUrl(request: Request, deps: ApiDeps = {}): Promise<Response> {
  return guarded(request, async () => {
    const { url } = UrlRequest.parse(await readJson(request));
    const result = await analyzeUrl(url, (u) => checkReputation(u, deps.safeBrowsingKey, deps.fetchImpl));
    return json(result);
  }, deps.rateLimiter);
}

export function handleAnalyzeMessage(request: Request, deps: ApiDeps = {}): Promise<Response> {
  return guarded(request, async () => {
    const { message } = MessageRequest.parse(await readJson(request));
    return json(analyzeMessage(message));
  }, deps.rateLimiter);
}

export function handleHealth(deps: ApiDeps = {}): Response {
  return json({
    status: "ok",
    engine: "deterministic-rules",
    reputationProvider: deps.safeBrowsingKey ? "google-safe-browsing" : "none",
  });
}

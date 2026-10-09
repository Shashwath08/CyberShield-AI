import { describe, expect, it, vi } from "vitest";

import * as analyze from "@/lib/engine/analyze";
import { handleAnalyzeMessage, handleAnalyzeUrl, handleHealth, RateLimiter } from "@/server/api";

const req = (body: unknown, raw = false) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
const fresh = () => ({ rateLimiter: new RateLimiter(100, 60_000) });

describe("API handlers", () => {
  it("analyses a URL through the real engine and returns the contract shape", async () => {
    const res = await handleAnalyzeUrl(
      req({ url: "http://paypal.com.secure-verify.xyz/login" }),
      fresh(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await res.json();
    expect(body).toMatchObject({
      type: "url",
      level: expect.any(String),
      score: expect.any(Number),
    });
    expect(
      Array.isArray(body.indicators) &&
        Array.isArray(body.recommendations) &&
        Array.isArray(body.limitations),
    ).toBe(true);
  });
  it("analyses a message", async () => {
    const res = await handleAnalyzeMessage(req({ message: "Share your OTP immediately" }), fresh());
    expect((await res.json()).indicators.length).toBeGreaterThan(0);
  });
  it("rejects unsupported schemes with 422", async () => {
    const res = await handleAnalyzeUrl(req({ url: "javascript:alert(1)" }), fresh());
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("invalid_input");
  });
  it("validates request bodies", async () => {
    expect((await handleAnalyzeUrl(req({}), fresh())).status).toBe(422);
    expect((await handleAnalyzeUrl(req({ url: "a.com", extra: 1 }), fresh())).status).toBe(422);
    expect((await handleAnalyzeMessage(req("{not json", true), fresh())).status).toBe(422);
    expect((await handleAnalyzeMessage(req({ message: "a".repeat(5001) }), fresh())).status).toBe(
      422,
    );
  });
  it("hides internal errors behind a generic message", async () => {
    const spy = vi.spyOn(analyze, "analyzeMessage").mockImplementation(() => {
      throw new Error("secret stack detail");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleAnalyzeMessage(req({ message: "hello" }), fresh());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toMatch(/secret stack/);
    spy.mockRestore();
  });
  it("rate limits bursts", async () => {
    const rateLimiter = new RateLimiter(2, 60_000);
    const codes = [];
    for (let i = 0; i < 3; i++)
      codes.push((await handleAnalyzeMessage(req({ message: "hi" }), { rateLimiter })).status);
    expect(codes).toEqual([200, 200, 429]);
  });
  it("still works when the reputation provider is down", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("down"));
    const res = await handleAnalyzeUrl(req({ url: "https://example.com" }), {
      ...fresh(),
      safeBrowsingKey: "k",
      fetchImpl,
    });
    expect(res.status).toBe(200);
    expect(
      (await res.json()).indicators.find((i: { id: string }) => i.id === "reputation").kind,
    ).toBe("unavailable");
  });
  it("health never leaks the API key", async () => {
    const text = await handleHealth({ safeBrowsingKey: "SUPERSECRET" }).text();
    expect(text).not.toMatch(/SUPERSECRET/);
    expect(JSON.parse(text).reputationProvider).toBe("google-safe-browsing");
  });
});

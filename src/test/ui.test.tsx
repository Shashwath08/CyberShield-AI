import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { analyzeMessage } from "@/lib/engine/analyze";
import { handleAnalyzeUrl, RateLimiter } from "@/server/api";
import { clearHistory, historyStats, loadHistory, queryHistory, resetHistoryCache, saveScan, updateSettings } from "@/services/history";

vi.mock("@tanstack/react-router", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (opts: object) => opts,
}));

const { UrlScannerPage } = await import("@/routes/url");
const { MessageAnalyzerPage } = await import("@/routes/message");
const { HistoryPage } = await import("@/routes/history");

/** Route fetch calls into the real server handlers — an integration path with no network. */
function wireFetchToHandlers() {
  const rateLimiter = new RateLimiter(1000, 60_000);
  vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
    const request = new Request(`http://localhost${input}`, init);
    if (input === "/api/analyze/url") return handleAnalyzeUrl(request, { rateLimiter });
    const { handleAnalyzeMessage } = await import("@/server/api");
    return handleAnalyzeMessage(request, { rateLimiter });
  }));
}

beforeEach(() => {
  localStorage.clear();
  resetHistoryCache();
  vi.unstubAllGlobals();
});

describe("URL scanner page", () => {
  it("has an accessible labelled field and disabled submit when empty", () => {
    render(<UrlScannerPage />);
    expect(screen.getByRole("heading", { level: 1, name: "URL Scanner" })).toBeInTheDocument();
    expect(screen.getByLabelText("Link to check")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analyse link/i })).toBeDisabled();
  });
  it("submits via keyboard Enter, shows loading then results, and saves history", async () => {
    wireFetchToHandlers();
    render(<UrlScannerPage />);
    const input = screen.getByLabelText("Link to check");
    fireEvent.change(input, { target: { value: "http://paypal.com.secure-verify.xyz/login" } });
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByText(/Analysing/)).toBeInTheDocument();
    const result = await screen.findByRole("article");
    expect(within(result).getByRole("img", { name: /risk score \d+ out of 100/i })).toBeInTheDocument();
    expect(within(result).getByRole("heading", { name: "What you should do" })).toBeInTheDocument();
    expect(loadHistory()).toHaveLength(1);
  });
  it("announces errors in an alert", async () => {
    wireFetchToHandlers();
    render(<UrlScannerPage />);
    const input = screen.getByLabelText("Link to check");
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unsupported URL scheme/);
  });
  it("shows a friendly error when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    render(<UrlScannerPage />);
    const input = screen.getByLabelText("Link to check");
    fireEvent.change(input, { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /analyse link/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not reach/);
  });
});

describe("Message analyzer page", () => {
  it("highlights suspicious phrases as text, never raw HTML", async () => {
    wireFetchToHandlers();
    render(<MessageAnalyzerPage />);
    const box = screen.getByLabelText("Message text");
    fireEvent.change(box, { target: { value: "<img src=x onerror=alert(1)> Please share the OTP now" } });
    fireEvent.click(screen.getByRole("button", { name: /analyse message/i }));
    const mark = await waitFor(() => {
      const m = document.querySelector("mark");
      if (!m) throw new Error("no mark");
      return m;
    });
    expect(mark).toHaveTextContent(/share the OTP/);
    expect(document.querySelector("img[src=x]")).toBeNull();
    expect(screen.getByText(/Never share OTPs/)).toBeInTheDocument();
  });
});

describe("History", () => {
  it("shows an empty state", () => {
    render(<HistoryPage />);
    expect(screen.getByText("No scans saved yet.")).toBeInTheDocument();
  });
  it("filters, paginates, deletes and stores only previews for messages", () => {
    const long = `Share your OTP now. ${"x".repeat(300)}`;
    saveScan(analyzeMessage(long));
    for (let i = 0; i < 11; i++) saveScan(analyzeMessage(`Lunch at ${i}?`));
    const all = loadHistory();
    expect(all).toHaveLength(12);
    expect(all.at(-1)!.result.input.length).toBeLessThan(200);
    expect(queryHistory(all, { level: "low" }).total).toBe(11);
    expect(queryHistory(all, { search: "otp" }).total).toBe(1);
    expect(queryHistory(all, { page: 2 })).toMatchObject({ pages: 2, items: expect.any(Array) });
    expect(historyStats(all).messages).toBe(12);

    render(<HistoryPage />);
    fireEvent.change(screen.getByLabelText("Risk"), { target: { value: "high" } });
    expect(screen.getByText(/1 scan$/)).toBeInTheDocument();
    act(() => clearHistory());
    expect(screen.getByText("No scans saved yet.")).toBeInTheDocument();
  });
  it("does not save when the user disables history", () => {
    updateSettings({ saveHistory: false });
    expect(saveScan(analyzeMessage("hello"))).toBeNull();
    expect(loadHistory()).toHaveLength(0);
  });
});

import type { Indicator } from "./types";

/** Fixed provider endpoint — the submitted URL is only ever sent as data, never fetched. */
const SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const TIMEOUT_MS = 3000;

export interface ReputationOutcome {
  checked: boolean;
  indicator: Indicator;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const unavailable = (reason: string): ReputationOutcome => ({
  checked: false,
  indicator: { id: "reputation", group: "reputation", title: "Reputation lookup unavailable", kind: "unavailable", weight: 0, evidence: reason },
});

/**
 * Optional Google Safe Browsing lookup. Single attempt, bounded timeout, fails closed
 * to "unavailable" (never to "safe").
 */
export async function checkReputation(url: string, apiKey: string | undefined, fetchImpl: FetchLike = fetch): Promise<ReputationOutcome> {
  if (!apiKey) return unavailable("No threat-intelligence provider is configured, so this link was not checked against known-bad lists.");
  try {
    const res = await fetchImpl(`${SAFE_BROWSING_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "cybershield-ai", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
    });
    if (!res.ok) return unavailable(`The reputation provider returned an error (HTTP ${res.status}); the result is unknown.`);
    const data = (await res.json()) as { matches?: Array<{ threatType?: string }> };
    if (data.matches?.length) {
      const types = [...new Set(data.matches.map((m) => m.threatType ?? "UNKNOWN"))].join(", ");
      return { checked: true, indicator: { id: "reputation", group: "reputation", title: "Listed by Google Safe Browsing", kind: "confirmed", weight: 90, evidence: `Flagged as: ${types}.` } };
    }
    return { checked: true, indicator: { id: "reputation", group: "reputation", title: "Not on Google Safe Browsing lists", kind: "inconclusive", weight: 0, evidence: "Not currently listed. New phishing sites often are not listed yet, so this is not proof of safety." } };
  } catch {
    return unavailable("The reputation provider did not respond in time; the result is unknown.");
  }
}

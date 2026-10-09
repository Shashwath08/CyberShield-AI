import type { Indicator, RiskLevel, ScanType } from "./types";

const GROUP_ADVICE: Record<string, string> = {
  otp: "Never share OTPs, PINs or CVVs with anyone — including people claiming to be bank staff.",
  credentials: "Do not enter passwords or card details from a link in a message. Open the official app or type the address yourself.",
  threat: "Verify any account warning by calling the number on the back of your card or on the official website.",
  kyc: "Complete KYC only through your bank's official app or branch, never through a link or phone call.",
  impersonation: "Contact the organisation using contact details you find independently, not the ones in this message or link.",
  payment: "Remember: you never enter a UPI PIN or scan a QR code to receive money. Decline unexpected collect requests.",
  "advance-fee": "Do not pay any fee to release prizes, loans, parcels or refunds.",
  prize: "Ignore prize or lottery claims for contests you did not enter.",
  job: "Research employers independently. Genuine jobs never ask you to pay or to complete paid 'tasks'.",
  investment: "Be wary of guaranteed returns. Check that the platform is registered with your country's financial regulator.",
  "remote-access": "Do not install AnyDesk, TeamViewer or similar apps at a stranger's request. Uninstall them if you already did.",
  delivery: "Track parcels only through the courier's official website or app using your own tracking number.",
  social: "Talk to someone you trust before acting on a message that asks for secrecy.",
  manipulation: "Treat messages that try to instruct automated tools as highly suspicious.",
  link: "Do not open the link in this message. If you must check, type the official address manually.",
  deception: "Do not trust this link: the real destination is different from what it appears to be.",
  idn: "Check the domain carefully — characters from other alphabets can imitate familiar names.",
  "host-ip": "Avoid entering any personal information on pages reached through an IP address.",
  shortener: "Shortened links hide their destination. Ask the sender for the full link or reach the site directly.",
  "credential-path": "Avoid entering credentials on pages reached through links in messages.",
  transport: "Never type passwords on a page that is not served over HTTPS.",
};

const EXPOSURE_ADVICE = [
  "If you already entered credentials, change that password through the official service and sign out of other sessions.",
  "If money was transferred, contact your bank or payment provider immediately and report it (in India: call 1930 or visit cybercrime.gov.in).",
];

export function recommendationsFor(indicators: readonly Indicator[], level: RiskLevel, type: ScanType): string[] {
  const groups = new Set(indicators.filter((i) => i.kind !== "unavailable" && i.weight > 0).map((i) => i.group));
  const recs = [...groups].map((g) => GROUP_ADVICE[g]).filter((r): r is string => Boolean(r));
  if (level === "high" || level === "critical") recs.push(...EXPOSURE_ADVICE);
  if (recs.length === 0) {
    recs.push(
      type === "url"
        ? "No strong warning signs were found. Still, only enter sensitive information on sites you reached by typing the address yourself."
        : "No strong warning signs were found. If the message asks you to act on money or accounts, confirm through an official channel first.",
    );
  }
  return [...new Set(recs)];
}

const LEVEL_SUMMARY: Record<RiskLevel, string> = {
  low: "few or no warning signs were found",
  moderate: "some warning signs were found that deserve caution",
  high: "several strong warning signs of a scam were found",
  critical: "this matches multiple well-known scam or phishing patterns",
};

/** Deterministic, plain-language explanation built only from engine findings. */
export function explain(indicators: readonly Indicator[], level: RiskLevel, score: number, type: ScanType): string {
  const active = [...indicators].filter((i) => i.weight > 0 && i.kind !== "unavailable").sort((a, b) => b.weight - a.weight);
  const subject = type === "url" ? "this link" : "this message";
  const head = `Risk score ${score}/100 (${level}): ${LEVEL_SUMMARY[level]} in ${subject}.`;
  if (active.length === 0) {
    return `${head} That is not proof it is safe — heuristics cannot see everything a scammer might do.`;
  }
  const top = active.slice(0, 3).map((i) => i.title.toLowerCase());
  return `${head} The main concerns are: ${top.join("; ")}. Each finding below lists the exact evidence.`;
}

export function limitationsFor(type: ScanType, reputationChecked: boolean): string[] {
  const list = [
    "Scores come from transparent heuristic rules. They are not calibrated probabilities and cannot guarantee safety.",
    "A low score does not mean the content is safe; new or targeted scams may show no known pattern.",
  ];
  if (type === "url") {
    list.push("The link was never opened. Redirects, page content and downloads were not inspected.");
    list.push("Domain ownership is approximated from a built-in list of domain suffixes.");
  }
  if (!reputationChecked) list.push("No threat-intelligence provider was consulted, so known-bad lists were not checked.");
  return list;
}

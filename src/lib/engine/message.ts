import { LIMITS, InputError, type Indicator } from "./types";

interface MessageRule {
  id: string;
  group: string;
  title: string;
  weight: number;
  pattern: RegExp;
  explain: string;
  /** When true, a negation just before the match ("do not share") cancels it. */
  negatable?: boolean;
}

const BANKS = "sbi|hdfc|icici|axis|kotak|pnb|bank of baroda|canara|paytm|phonepe|google ?pay|amazon pay|rbi|income ?tax";

export const MESSAGE_RULES: readonly MessageRule[] = [
  { id: "otp-request", group: "otp", title: "Asks you to share an OTP or PIN", weight: 50, negatable: true,
    pattern: /\b(share|send|tell|provide|forward|give|reply with|confirm)\b[^.!?\n]{0,40}\b(otp|one[- ]time (password|code)|verification code|upi pin|atm pin|cvv|pin)\b/i,
    explain: "No genuine bank, wallet or company will ask you to share an OTP, PIN or CVV." },
  { id: "credential-request", group: "credentials", title: "Asks for passwords or card details", weight: 45, negatable: true,
    pattern: /\b(enter|confirm|verify|update|provide|submit)\b[^.!?\n]{0,30}\b(password|login details|credentials|net ?banking|card (number|details)|debit card|credit card|aadhaar|pan (card|number))\b/i,
    explain: "Requests to enter secrets or identity numbers via a message are a hallmark of credential and identity theft." },
  { id: "account-threat", group: "threat", title: "Threatens account suspension", weight: 25,
    pattern: /\b(account|card|sim|kyc|wallet|number|service)\b[^.!?\n]{0,30}\b(will be |has been |is )?(blocked|suspended|deactivated|frozen|closed|restricted|terminated)\b/i,
    explain: "Threats of blocking create fear so you act before thinking." },
  { id: "urgency", group: "urgency", title: "Creates artificial urgency", weight: 15,
    pattern: /\b(urgent(ly)?|immediately|within \d+ ?(hours?|hrs|minutes|mins)|today itself|last (warning|chance|reminder)|act now|expires? (today|tonight|soon)|final notice)\b/i,
    explain: "Pressure to act quickly is a classic social-engineering tactic." },
  { id: "kyc", group: "kyc", title: "KYC update demand", weight: 25,
    pattern: /\bkyc\b[^.!?\n]{0,40}\b(update|expired?|pending|verify|complete|incomplete)\b/i,
    explain: "Fake KYC alerts are one of the most common banking scams. Banks handle KYC through branches or official apps." },
  { id: "bank-impersonation", group: "impersonation", title: "Claims to be from a bank or payment service", weight: 12,
    pattern: new RegExp(`\\b(dear (customer|user|sir|madam)|${BANKS})\\b`, "i"),
    explain: "Mentions a financial brand. That alone is normal; combined with other signals it suggests impersonation." },
  { id: "upi-collect", group: "payment", title: "Payment request disguised as receiving money", weight: 50,
    pattern: /\b(enter (your )?upi pin|scan (the |this )?qr|approve (the )?(collect|payment) request)\b[^.!?\n]{0,50}\b(receive|refund|cashback|prize|credited|reward)/i,
    explain: "You never need to enter a UPI PIN or scan a QR code to RECEIVE money — only to pay." },
  { id: "advance-fee", group: "advance-fee", title: "Asks for a fee to release money or goods", weight: 35,
    pattern: /\b(processing|registration|delivery|customs|release|clearance|activation|security|refundable) (fee|charge|deposit)\b/i,
    explain: "Paying a small fee to unlock a larger reward is advance-fee fraud." },
  { id: "prize", group: "prize", title: "Unexpected prize or lottery win", weight: 25,
    pattern: /\b(you('ve| have)? won|winner|lottery|lucky draw|jackpot|claim your (prize|reward|gift))\b/i,
    explain: "You cannot win a contest you never entered." },
  { id: "job-offer", group: "job", title: "Too-good-to-be-true job offer", weight: 25,
    pattern: /\b(work from home|part[- ]time (job|work)|earn (rs\.?|₹|\$|inr)? ?\d[\d,]*[^.!?\n]{0,15}(per|a|\/) ?(day|hour|task))\b/i,
    explain: "Unsolicited jobs promising high pay for simple tasks often lead to task or deposit scams." },
  { id: "investment", group: "investment", title: "Guaranteed investment returns", weight: 35,
    pattern: /\b(guaranteed (returns?|profit)|assured returns?|double your (money|investment)|\d+% (daily|weekly|monthly) (returns?|profit)|risk[- ]free (profit|investment))\b/i,
    explain: "Real investments never guarantee high returns." },
  { id: "remote-access", group: "remote-access", title: "Asks you to install remote-access software", weight: 45,
    pattern: /\b(anydesk|teamviewer|quick ?support|rustdesk|screen ?shar(e|ing) app|install (this|the) app)\b/i,
    explain: "Remote-access apps let a stranger see and control your phone, including banking apps and OTPs." },
  { id: "gift-card", group: "payment", title: "Payment via gift cards or crypto", weight: 35,
    pattern: /\b(pay|buy|purchase|send)\b[^.!?\n]{0,30}\b(gift ?cards?|itunes cards?|google play cards?|bitcoin|usdt|crypto)\b/i,
    explain: "Untraceable payment methods are preferred by scammers." },
  { id: "delivery", group: "delivery", title: "Delivery problem notice", weight: 15,
    pattern: /\b(parcel|package|shipment|delivery|courier)\b[^.!?\n]{0,40}\b(failed|on hold|pending|unable|held|incomplete address|reschedule)\b/i,
    explain: "Fake delivery notices lure people to pay small 're-delivery' fees on phishing pages." },
  { id: "secrecy", group: "social", title: "Asks you to keep it secret", weight: 15,
    pattern: /\b(don'?t tell anyone|do not tell anyone|keep (this|it) (confidential|secret)|between us)\b/i,
    explain: "Isolating victims from people who could warn them is a manipulation tactic." },
  { id: "manipulation", group: "manipulation", title: "Text tries to instruct automated tools", weight: 20,
    pattern: /\b(ignore (all |any )?(previous |prior )?instructions|system prompt|you are now|mark (this|it) as safe|classify (this|it) as (safe|legitimate))\b/i,
    explain: "The message contains instructions aimed at AI or filters. It was treated as data and did not change the analysis." },
];

const NEGATION_RE = /\b(not|never|don'?t|do not|no one|nobody|won'?t)\b[^.!?\n]{0,15}$/i;
const URL_IN_TEXT_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|net|org|info|xyz|top|ly|co|io|link|site|online|click|me)(?:\/[^\s<>"']*)?)/gi;

export function validateMessage(raw: string): string {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) throw new InputError("Please paste a message to analyse.");
  if (text.length > LIMITS.messageMaxLength) {
    throw new InputError(`Message is too long (max ${LIMITS.messageMaxLength} characters).`);
  }
  return text;
}

export function messageIndicators(text: string): Indicator[] {
  const out: Indicator[] = [];
  for (const rule of MESSAGE_RULES) {
    const match = findMatch(text, rule);
    if (!match) continue;
    out.push({
      id: rule.id, group: rule.group, title: rule.title, weight: rule.weight, kind: "suspicious",
      evidence: `“${match.text}” — ${rule.explain}`,
      span: { start: match.index, end: match.index + match.text.length },
    });
  }
  return out;
}

function findMatch(text: string, rule: MessageRule): { text: string; index: number } | undefined {
  const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
  for (const m of text.matchAll(re)) {
    const index = m.index ?? 0;
    // "Do not share this OTP" is protective advice, not a request.
    if (rule.negatable && NEGATION_RE.test(text.slice(Math.max(0, index - 25), index))) continue;
    return { text: m[0], index };
  }
  return undefined;
}

export function extractLinks(text: string): Array<{ text: string; index: number }> {
  const links: Array<{ text: string; index: number }> = [];
  for (const m of text.matchAll(URL_IN_TEXT_RE)) {
    if (links.length >= LIMITS.maxLinksPerMessage) break;
    links.push({ text: m[0].replace(/[.,;:!?)]+$/, ""), index: m.index ?? 0 });
  }
  return links;
}

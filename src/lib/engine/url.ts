import { InputError, LIMITS, type Indicator } from "./types";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;

const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "rb.gy",
  "tiny.cc",
  "s.id",
  "v.gd",
  "bitly.com",
]);

const MULTI_PART_SUFFIXES = new Set([
  "co.in",
  "org.in",
  "net.in",
  "gov.in",
  "ac.in",
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "com.br",
  "co.jp",
  "com.sg",
  "co.za",
  "com.mx",
]);

const BRANDS = [
  "paypal",
  "amazon",
  "google",
  "apple",
  "microsoft",
  "netflix",
  "facebook",
  "instagram",
  "whatsapp",
  "sbi",
  "onlinesbi",
  "hdfcbank",
  "hdfc",
  "icici",
  "icicibank",
  "axisbank",
  "kotak",
  "paytm",
  "phonepe",
  "flipkart",
  "irctc",
  "incometax",
  "linkedin",
  "dhl",
  "fedex",
];

const LOW_TRUST_TLDS = new Set([
  "zip",
  "mov",
  "xyz",
  "top",
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "click",
  "country",
  "rest",
  "cam",
]);

const CREDENTIAL_WORDS =
  /(log-?in|sign-?in|verify|verification|account|update|secure|password|kyc|otp|wallet|banking|unlock|confirm)/i;

const HOMOGLYPHS: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

export interface ParsedUrl {
  url: URL;
  normalized: string;
}

/** Validate and normalise a user-supplied URL. Never performs network access. */
export function parseUrl(raw: string): ParsedUrl {
  const input = raw.trim();
  if (!input) throw new InputError("Please enter a URL.");
  if (input.length > LIMITS.urlMaxLength) {
    throw new InputError(`URL is too long (max ${LIMITS.urlMaxLength} characters).`);
  }
  if (/\s/.test(input) || [...input].some((c) => c.charCodeAt(0) < 32))
    throw new InputError("URL must not contain spaces or control characters.");

  const scheme = SCHEME_RE.exec(input)?.[1]?.toLowerCase();
  const hasAuthority = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  // "example.com:8080/x" looks like a scheme to the regex; treat it as host:port.
  const looksLikeHostPort = scheme !== undefined && !hasAuthority && /^[^:/]+:\d+/.test(input);
  const candidate = scheme && !looksLikeHostPort ? input : `http://${input}`;

  if (scheme && !looksLikeHostPort && !ALLOWED_SCHEMES.has(`${scheme}:`)) {
    throw new InputError(
      `Unsupported URL scheme "${scheme}:". Only http and https links can be analysed.`,
    );
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new InputError("This does not look like a valid web address.");
  }
  if (!ALLOWED_SCHEMES.has(url.protocol))
    throw new InputError("Only http and https links can be analysed.");
  if (!isValidHostname(url.hostname)) throw new InputError("The hostname is malformed.");
  return { url, normalized: url.href };
}

function isValidHostname(host: string): boolean {
  if (!host || host.length > 253) return false;
  if (host.startsWith("[")) return true; // IPv6 literal, already validated by URL
  const labels = host.replace(/\.$/, "").split(".");
  return labels.every(
    (l) =>
      l.length > 0 &&
      l.length <= 63 &&
      /^[a-z0-9_-]+$/i.test(l) &&
      !l.startsWith("-") &&
      !l.endsWith("-"),
  );
}

export function isIpHost(host: string): boolean {
  if (host.startsWith("[")) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** Approximate registrable domain (eTLD+1) using a small suffix list. */
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  const take = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-take).join(".");
}

function deHomoglyph(s: string): string {
  return s.replace(/[013457@$]/g, (c) => HOMOGLYPHS[c] ?? c);
}

function brandOf(label: string): string | undefined {
  return BRANDS.find((b) => label === b || label.split("-").includes(b));
}

/** Pure, offline URL indicator extraction. */
export function urlIndicators(parsed: ParsedUrl, raw: string): Indicator[] {
  const { url } = parsed;
  const host = url.hostname.toLowerCase();
  const out: Indicator[] = [];
  const add = (i: Indicator) => out.push(i);

  if (isIpHost(host)) {
    add({
      id: "ip-host",
      group: "host-ip",
      title: "IP address instead of a domain name",
      kind: "inconclusive",
      weight: 20,
      evidence: `The link points directly to ${host}. Legitimate services rarely ask users to visit raw IP addresses, though internal tools and routers do.`,
    });
  }

  if (url.username || url.password || /^[a-z]+:\/\/[^/?#]*@/i.test(raw.trim())) {
    add({
      id: "userinfo",
      group: "deception",
      title: "Text before '@' hides the real destination",
      kind: "suspicious",
      weight: 45,
      evidence: `Everything before "@" is ignored by browsers. The real host is ${host}.`,
    });
  }

  if (host.split(".").some((l) => l.startsWith("xn--"))) {
    add({
      id: "punycode",
      group: "idn",
      title: "Internationalised (punycode) domain",
      kind: "suspicious",
      weight: 30,
      evidence: `The hostname ${host} uses punycode, which can disguise look-alike characters from other alphabets.`,
    });
  }

  if (!isIpHost(host)) addDomainIndicators(host, add);

  const sld = registrableDomain(host);
  if (SHORTENERS.has(sld) || SHORTENERS.has(host)) {
    add({
      id: "shortener",
      group: "shortener",
      title: "URL shortener hides the final destination",
      kind: "inconclusive",
      weight: 20,
      evidence: `${host} is a link-shortening service. The real destination cannot be seen without visiting it, which this tool deliberately does not do.`,
    });
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    add({
      id: "port",
      group: "port",
      title: "Unusual network port",
      kind: "inconclusive",
      weight: 15,
      evidence: `The link uses port ${url.port}. Public websites normally use the default ports.`,
    });
  }

  const encodedCount = (raw.match(/%[0-9a-f]{2}/gi) ?? []).length;
  if (/%25[0-9a-f]{2}/i.test(raw) || encodedCount >= 6) {
    add({
      id: "encoding",
      group: "obfuscation",
      title: "Heavy or double URL encoding",
      kind: "suspicious",
      weight: 15,
      evidence: `The link contains ${encodedCount} percent-encoded sequences${/%25/i.test(raw) ? " including double encoding" : ""}, a technique used to hide text from readers and filters.`,
    });
  }

  const pathAndQuery = decodeSafe(url.pathname + url.search);
  const cred = CREDENTIAL_WORDS.exec(pathAndQuery);
  if (cred) {
    add({
      id: "credential-path",
      group: "credential-path",
      title: "Login or account-related wording in the link",
      kind: "inconclusive",
      weight: 12,
      evidence: `The path contains "${cred[0]}". Common on real login pages too, but phishing links rely on it.`,
    });
    if (url.protocol === "http:") {
      add({
        id: "http-credentials",
        group: "transport",
        title: "Account page without encryption (HTTP)",
        kind: "suspicious",
        weight: 12,
        evidence:
          "This account-related page uses plain HTTP, so anything typed could be intercepted.",
      });
    }
  }

  return out;
}

function addDomainIndicators(host: string, add: (i: Indicator) => void): void {
  const sld = registrableDomain(host);
  const sldLabel = sld.split(".")[0] ?? "";
  const subLabels = host
    .slice(0, Math.max(0, host.length - sld.length))
    .split(".")
    .filter(Boolean);
  const tld = host.split(".").pop() ?? "";

  const brandInSub = subLabels.map(brandOf).find(Boolean);
  const ownBrand = brandOf(sldLabel);
  if (brandInSub && brandInSub !== ownBrand) {
    add({
      id: "brand-subdomain",
      group: "impersonation",
      title: `"${brandInSub}" appears outside the real domain`,
      kind: "suspicious",
      weight: 50,
      evidence: `The link mentions ${brandInSub}, but the domain actually in control is ${sld}.`,
    });
  } else if (ownBrand && sldLabel !== ownBrand) {
    add({
      id: "brand-combo",
      group: "impersonation",
      title: `Domain combines "${ownBrand}" with other words`,
      kind: "suspicious",
      weight: 35,
      evidence: `${sld} contains the brand name ${ownBrand} plus extra words. Official domains are usually just the brand.`,
    });
  } else if (!ownBrand) {
    const normalized = deHomoglyph(sldLabel);
    const lookalike = BRANDS.find(
      (b) => b.length >= 4 && normalized !== sldLabel && normalized.includes(b),
    );
    if (lookalike) {
      add({
        id: "homoglyph",
        group: "impersonation",
        title: `Look-alike of "${lookalike}"`,
        kind: "suspicious",
        weight: 55,
        evidence: `${sld} swaps letters for similar-looking digits or symbols to resemble ${lookalike}.`,
      });
    }
  }

  if (subLabels.length >= 4) {
    add({
      id: "deep-subdomains",
      group: "structure",
      title: "Unusually many subdomains",
      kind: "inconclusive",
      weight: 10,
      evidence: `${host} has ${subLabels.length} subdomain levels, which can push the real domain out of view on small screens.`,
    });
  }
  if ((sldLabel.match(/-/g) ?? []).length >= 3) {
    add({
      id: "hyphens",
      group: "structure",
      title: "Many hyphens in the domain",
      kind: "inconclusive",
      weight: 10,
      evidence: `${sld} contains several hyphens, common in throwaway phishing domains.`,
    });
  }
  if (LOW_TRUST_TLDS.has(tld)) {
    add({
      id: "tld",
      group: "tld",
      title: `Frequently abused ending ".${tld}"`,
      kind: "inconclusive",
      weight: 10,
      evidence: `.${tld} domains are cheap and disproportionately used in abuse reports. Many legitimate sites use it too.`,
    });
  }
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

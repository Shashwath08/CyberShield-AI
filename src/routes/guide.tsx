import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Security Guide — CyberShield AI" },
      { name: "description", content: "Plain-language advice to recognise phishing, OTP, KYC, UPI and job scams — and what to do if you were caught." },
      { property: "og:title", content: "Security Guide — CyberShield AI" },
      { property: "og:description", content: "Plain-language advice to recognise and respond to online scams." },
    ],
  }),
  component: GuidePage,
});

const TOPICS: Array<{ title: string; points: string[] }> = [
  { title: "Golden rules", points: [
    "Never share OTPs, passwords, PINs or CVVs — no real bank, wallet or government office will ask.",
    "You never need a UPI PIN or QR scan to receive money.",
    "Urgency, threats and prizes are pressure tactics. Slow down.",
    "Reach organisations through contact details you find yourself, not ones in the message.",
  ]},
  { title: "Checking a link", points: [
    "Read the domain right before the first single “/”. paypal.com.secure-login.xyz belongs to secure-login.xyz.",
    "Watch for swapped characters: 0 for o, 1 for l, rn for m.",
    "Shortened links hide where they go. Ask for the full address.",
    "A padlock (HTTPS) only means the connection is encrypted — scam sites have padlocks too.",
  ]},
  { title: "Common scams", points: [
    "KYC / account-block alerts linking to a fake bank page.",
    "Parcel “delivery failed” messages asking for a small fee.",
    "Part-time job or “task” offers that later demand deposits.",
    "Investment groups promising guaranteed daily returns.",
    "Callers asking you to install AnyDesk or TeamViewer.",
  ]},
  { title: "If you were caught", points: [
    "Money sent: call your bank immediately to block the transaction. In India, call 1930 or report at cybercrime.gov.in.",
    "Password entered: change it through the official site/app and sign out of all other sessions.",
    "OTP shared: call your bank to freeze the account or card.",
    "Remote app installed: disconnect from the internet, uninstall it, and change banking passwords from another device.",
  ]},
];

function GuidePage() {
  return (
    <>
      <PageHeader eyebrow="Learn" title="Security Guide">Simple habits that stop most scams.</PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {TOPICS.map((t) => (
          <section key={t.title} aria-labelledby={`g-${t.title}`} className="rounded-xl border bg-card p-5">
            <h2 id={`g-${t.title}`} className="mb-3 text-lg font-semibold">{t.title}</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm">{t.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </section>
        ))}
      </div>
    </>
  );
}

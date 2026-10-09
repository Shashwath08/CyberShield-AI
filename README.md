# CyberShield AI — Intelligent Cybersecurity and Digital Safety Assistant

Checks suspicious **links** and **messages** (SMS, email, WhatsApp, banking, UPI, KYC, delivery, job, investment) for phishing and scam patterns, explains the evidence in plain language and gives matching advice.

```text
input -> URL / message analysis -> indicator extraction -> risk score -> explanation -> recommendations
```

## Stack deviation from the brief (read first)

The brief asked for FastAPI + SQLAlchemy + SQLite + Pytest. This project runs on a platform that supports only a TypeScript full-stack (React 19 + TanStack Start on edge workers, Vite, Tailwind v4, Lucide). So:

| Brief | Implemented as |
|---|---|
| FastAPI endpoints | TanStack server routes: `GET /api/health`, `POST /api/analyze/url`, `POST /api/analyze/message` |
| Pydantic models | Zod request schemas (strict) + shared TS types (`src/lib/engine/types.ts`) |
| SQLite history + `/api/history*`, `/api/dashboard/stats` | **Browser-only** history (localStorage) with search, filters, pagination, per-item and full deletion; stats computed from it. Chosen because there are no user accounts — a shared server DB would expose one person's messages to another. |
| Pytest + Vitest | Vitest + React Testing Library only |
| OpenAPI docs | API contract documented below |
| Optional Ollama | Not included; explanations are deterministic. No AI service receives user content. |

## Run

```bash
bun install
bun run dev          # http://localhost:8080
bunx vitest run      # tests
bunx tsgo --noEmit   # type check
bunx eslint src      # lint
```
Optional: copy `.env.example` to `.env` and set `GOOGLE_SAFE_BROWSING_API_KEY`.

## API

`POST /api/analyze/url` `{ "url": string ≤2048 }` · `POST /api/analyze/message` `{ "message": string ≤5000 }`
→ `200 AnalysisResult { type, input, score 0–100, level low|moderate|high|critical, indicators[{id,group,title,evidence,kind,weight,span?}], explanation, recommendations[], limitations[], durationMs }`
→ `422 { error: { code, message } }` invalid input · `429` rate limited · `500` generic error.
`GET /api/health` → `{ status, engine, reputationProvider }`.

## Engine

- `url.ts` — scheme allow-list (http/https), hostname validation, IP hosts, `@` userinfo, punycode, brand-in-subdomain, brand combos, digit homoglyphs, deep subdomains, hyphens, abused TLDs, shorteners, ports, double/heavy encoding, credential wording, HTTP+credentials. HTTP, IPs or length alone never produce a high score.
- `message.ts` — 16 rules (OTP/PIN requests with negation handling, credentials, suspension threats, urgency, KYC, impersonation, UPI collect, advance fee, prizes, jobs, investments, remote access, gift cards/crypto, delivery, secrecy, prompt-injection). Embedded links are analysed structurally.
- `risk.ts` — strongest indicator per correlation group, combined as `100·(1−Π(1−w/100))`. Bands 0–24/25–49/50–74/75–100 are heuristic.
- `reputation.ts` — optional Safe Browsing, fixed endpoint, 3 s timeout, one attempt, `redirect: "error"`, fails to "unavailable", never to "safe".

## Security & privacy

- Submitted URLs are never fetched, followed or rendered as links (no SSRF surface).
- Strict body validation, 20 KB body cap, input length caps, rejection of `javascript:`, `file:`, `data:` etc.
- Generic error responses; logs record only the error class, never content.
- Security headers on API responses (`nosniff`, `no-store`, `DENY`, restrictive CSP, `no-referrer`).
- Rate limit 30 req/min per IP — **per server instance only** (edge isolates do not share memory).
- Same-origin API only; no CORS headers are sent, so other origins cannot read responses.
- Untrusted text is rendered as React text (no `dangerouslySetInnerHTML`); tested with an HTML payload.
- Prompt-injection phrases are flagged and cannot alter rules (no LLM in the loop).
- History: browser only, message scans keep a 140-char preview, can be disabled or deleted.
- API key read server-side from env, never returned (tested).

## Test results (actual run)

`bunx vitest run` → **4 files, 53 tests, 53 passed, 0 failed.** `tsgo` → 0 errors. `eslint` → 0 errors, 8 warnings (fast-refresh hints, mostly in generated UI kit).
Browser check (Playwright): message flow renders critical result with highlights; no page errors; no horizontal overflow at 375 px.

Untested: real Safe Browsing calls (mocked only), cross-browser screen-reader behaviour, automated axe scan (not installed), multi-instance rate limiting.

## Six-parameter audit

| Parameter | Implemented evidence | Tests / checks | Remaining issues |
|---|---|---|---|
| Code quality | Engine / API / services / UI separated; shared types; no `any`; centralised errors | tsgo clean, eslint 0 errors | Python stack not used (platform limit) |
| Security | Scheme allow-list, no URL fetching, zod strict, caps, headers, rate limit, generic errors, no raw HTML | api.test.ts (validation, 500 masking, rate limit, key not leaked), XSS UI test | Rate limit per instance; no dependency audit tool output recorded here |
| Efficiency | Pure regex/URL parsing, ms-level (`durationMs` shown, ~1–5 ms observed), reputation optional & bounded, memoised UI, link count cap | Determinism test, timeout test | No formal benchmark |
| Testing | 53 unit/API/UI/integration tests; UI tests route fetch into real handlers | All passing | See untested list |
| Accessibility | Skip link, landmarks, h1 per page, labels, live regions, `role=alert`, icon+text risk, focus rings, reduced motion, 44 px targets | Label/role tests; manual 375 px check | No automated axe scan; no screen-reader manual run |
| Problem alignment | Working URL + message analysis, evidence, explanations, tailored advice, guide, history | Benign/malicious/ambiguous cases tested | Heuristics; not a guarantee of safety |

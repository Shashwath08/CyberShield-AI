<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Detection logic lives only in `src/lib/engine/` as pure, deterministic TypeScript; UI and API call it, never re-implement it. Why: one source of truth, easy to unit test.
- HTTP endpoints are thin TanStack server routes under `src/routes/api/` delegating to `src/server/api.ts` (validation, rate limit, headers, error mapping). Why: handlers are testable without a server.
- Scan history is stored only in the browser (`src/services/history.ts`), never server-side. Why: no accounts, so server storage would risk exposing one person's messages to another.
- Submitted URLs are never fetched; the only outbound call is the optional fixed reputation endpoint. Why: SSRF and malware safety.

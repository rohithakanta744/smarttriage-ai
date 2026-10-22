# SmartTriage AI

Internal production-log triage console with offline demos, hosted AI and optional external FastAPI. Open `/guide` for the complete team-facing capability and limitations overview.

## Delivered scope
1. UTF-8 LOG/TXT/JSON/JSONL/CSV/TSV/HAR and gzip import, 20 MB compressed/expanded limit.
2. Format detection, line-numbered highlighted preparation preview, bounded 50,000-character extraction (head 50, tail 200, prioritized error context).
3. Teams share drafts/clipboard and authenticated official Teams/Slack webhook delivery with server-only secrets.
4. Markdown, PDF and post-mortem draft exports.
5. External `/health` checks every 30 seconds and manual latency ping.
6. Best-effort masking for email/IP/card/token/common secret patterns, with always-masked hosted AI, history and exports.
7. Anonymous device history (12 entries), search/tags and opt-in authenticated team workspaces with invitation codes and explicit report saves (latest 100 shown).

## Stack
React 19, TypeScript, TanStack Start/Router, TanStack Query, Vite, Tailwind 4, Radix, Zod, Lovable Cloud, AI SDK, Papa Parse, browser gzip streams and jsPDF. Hosted diagnosis uses Lovable AI through server functions, not an embedded Python process. No vector database, retrieval system or automatic remediation is implemented.

## Development
`bun install`, `bun run dev`, `bunx vitest run src/lib/log-processing.test.ts`.
Configure public Cloud URL/key for your environment and server-only `LOVABLE_API_KEY` for hosted AI. Never commit `.env` or tokens. Workspace tables/policies are in `drizzle/migrations/`; apply them to the target backend before enabling team features. Managed Google/Lovable and confirmed email auth are configured in Lovable Cloud.

## External FastAPI contract
Browser sends `POST /api/diagnose` with `{"error_log":"..."}` and expects `{"severity":"HIGH","root_cause":"...","recommended_action":"..."}`. Optional `confidence` (0–100) and `evidence_lines` are supported. Implement `GET /health` returning HTTP 200. Allow the app origin via CORS. Published HTTPS pages may block an HTTP service; use an HTTPS endpoint. Localhost refers to the browser user's machine. External connection failures never fall back silently to demo results.

## Honest readiness limits
Verification completed: real Hosted AI diagnosis, masking preview, Markdown/PDF downloads, rotating samples, reload-persistent local history, missing-backend failure and mobile layout. Rule tests cover ingestion, expanded gzip limits, privacy and official webhook validation. External contract success is checked with an intercepted test service, not a company backend. Optional workspace saving and actual Teams/Slack delivery remain unverified because no confirmed user or company webhook is available. Anonymous Hosted AI is suitable for an internal prototype; public production needs an approved abuse/spend-control strategy, organization-specific retention and access governance. Do not interpret a passing functional check as enterprise certification.

No company webhook has been provided: direct delivery must be configured and tested in your tenant. Masking is best-effort, not compliance certification. Confidence is a model estimate, not calibrated accuracy. No load/SLO testing, enterprise identity governance, audit-log export, org retention policy, binary trace decoding or automated root-cause validation is claimed. PDF's built-in font is Latin-oriented; Markdown preserves Unicode. Production release requires publishing plus organizational security/privacy review. Invitation codes are bearer invitations: share only with authorized teammates.

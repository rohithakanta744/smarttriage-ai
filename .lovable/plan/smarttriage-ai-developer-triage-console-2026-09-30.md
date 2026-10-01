# SmartTriage AI — developer triage console

A single-page internal tool where an engineer pastes a raw production error log and gets back a structured diagnosis: severity, root cause, recommended action. Diagnosis comes from your own FastAPI service.

## Screen

Clean Vercel-style minimal look (white/gray/black, subtle borders, monospace for logs, sans-serif for UI).

- Top bar: "SmartTriage AI" with a small "v1.0 prototype" badge, plus a settings control for the API address.
- Two columns on desktop, stacked on mobile.
  - Left: a large monospace log box ("Paste raw production error log or JSON alert here…"), a "Diagnose Log" button with a spark icon, and a "Load sample log" link.
  - Right: results area. Empty state says "Awaiting log input…". While running it shows staged text ("Scanning vector DB… Analyzing via LLM…"). On success it shows three stacked cards: a color-coded Severity badge (red CRITICAL, orange HIGH, amber MEDIUM, gray LOW), Root Cause, and Recommended Action.
- Errors from your service show as a clear inline message with the reason, not a crash.

## Connecting your API

Your FastAPI service runs outside this app, so the app needs its address.

- A settings panel lets you enter the base URL (e.g. `https://my-host.example.com`). It is remembered in the browser.
- If no address is set, the app says so up front and offers a demo mode that returns a canned example so the interface can still be reviewed.
- Requests go through this app's own server so your service is called server-side; this avoids browser cross-origin problems and keeps the address out of direct browser calls.

## Technical notes

- Route: rewrite `src/routes/index.tsx` as the console; add `head()` metadata (title/description/og/twitter).
- Server function `diagnoseLog` in `src/lib/diagnose.functions.ts`: takes `{ errorLog, apiBaseUrl }`, validates with Zod, POSTs `{ error_log }` to `${apiBaseUrl}/api/diagnose`, validates the response shape `{ root_cause, severity, recommended_action }`, maps non-200/unreachable into a typed error message.
- UI state via TanStack Query mutation; no backend/database is added.
- Design tokens (light neutral palette, mono + sans font pair) defined in `src/styles.css`; JetBrains Mono + Inter loaded via `<link>` in `__root.tsx`. No hardcoded color utilities.
- Components: `Navbar`, `LogInput`, `ResultPanel`, `SeverityBadge`, `ApiSettingsDialog` under `src/components/`.

## Open item

I don't have your FastAPI URL yet — you can paste it into the settings panel once the app is built, or tell me now and I'll set it as the default.

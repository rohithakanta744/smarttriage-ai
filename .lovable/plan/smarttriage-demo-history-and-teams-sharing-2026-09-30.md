# SmartTriage demo, history, and Teams sharing

## What will change
- Add a clear mode switch: **Demo** works entirely inside the app; **Connected backend** calls the configured FastAPI service.
- Replace the single sample with a selectable sample menu covering different incident types and severities, plus a quick action that rotates through them.
- In demo mode, diagnose each included sample with a matching realistic result instead of showing a backend error.
- Keep backend mode’s existing API contract and unreachable-server message.
- Save successful diagnoses on this device, show recent history, allow reopening entries, and provide a clear-history action.
- Add **Open in Teams** and **Copy report** actions for completed diagnoses.

## User experience
- The current mode and connection status stay visible in the top bar.
- History remains private to the current browser; no account is required.
- Teams opens a prefilled share draft when supported, while copy always provides a reliable fallback.

## Technical details
- Keep history and mode preferences in browser storage, with a bounded recent-items list.
- Add deterministic demo diagnosis mappings for the built-in samples and a general fallback for pasted logs.
- Continue using the existing server function only in connected-backend mode.
- Use Microsoft Teams’ share URL with an encoded plain-text diagnosis; no Microsoft credentials are required.
- Verify the demo flow, backend failure state, history restore, copy action, and desktop/mobile layouts.

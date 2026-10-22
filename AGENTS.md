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

- Use the shared SmartTriage AI pulse-path logo for product identity and derive the favicon from the same geometry so branding stays consistent.
- Keep anonymous diagnosis history and selected mode in browser storage; this preserves privacy and avoids requiring accounts for the internal prototype.
- Keep ingestion and masking in shared pure utilities with bounded browser gzip reading, so all transfers use consistent privacy rules.
- Use server functions for hosted AI and authenticated workspace/channel operations; external FastAPI calls run only in browser handlers to make localhost meaningful and avoid server-side arbitrary URL fetching.
- Enforce team membership through database policies and owner-check webhook configuration before privileged access; webhook secrets never leave server storage.
- Keep the team guide as a separate content route and maintain reproducible rule tests next to shared logic.
- Keep diagnosis schemas and field-wise masking in a browser-safe module, separate from server functions, to prevent circular imports and JSON corruption.
- Keep engine comparison isolated from normal diagnosis history and use one masked input snapshot for both engines, so comparisons are reproducible and never silently substitute demos.
- Ship the external FastAPI service only as a downloadable source kit; it runs on user-owned hosting and holds its own provider credentials, never project secrets.
- Keep the visual walkthrough a locally rendered, chapter-based player so explanations remain accessible without video hosting or AI generation costs.

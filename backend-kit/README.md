# SmartTriage FastAPI service kit

This is real AI integration code, not a trained model and not a demo. The service uses your own OpenAI account and a Responses-compatible model you have access to. It does not contain or reuse the app's private Lovable AI key. OpenAI bills your account separately. Its provider retention policies apply; review them before transferring company logs.

## Run locally

Requires Python 3.11 or newer.

```sh
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
```

Set OPENAI_API_KEY to your own credential in the local .env file. Set AI_MODEL to an exact model ID available to your account that supports Responses with strict structured output. This kit intentionally does not guess your model access. Set ALLOWED_ORIGINS to the exact app origin(s), separated by commas, without trailing slashes. Never commit the .env file or put the key in a browser.

```sh
uvicorn main:app --host 127.0.0.1 --port 8000
pytest -q
```

In SmartTriage choose **Backend**, open service settings and save `http://localhost:8000`. Check health, then diagnose a log. `/health` reports configuration and liveness, not a successful upstream AI call. `/api/diagnose` accepts `{ "error_log": "..." }` and returns the exact severity, root_cause and recommended_action fields plus confidence and evidence_lines. Every request calls live AI; failures never become demos. Streaming is consumed inside Python, and the final validated diagnosis is returned as JSON to match the app's existing contract.

## Published app / production

Localhost means each browser user's own machine. An HTTPS app may block HTTP localhost requests or require local-network permission. For team access deploy this Python service to your own HTTPS hosting, set the app's exact origin and save that HTTPS base address in SmartTriage. This kit does **not** deploy a Python server inside Lovable.

The server binds to localhost by default. This is a local prototype, not an authenticated public service: CORS and origin checks are not authentication. Before exposing it publicly, add verified user identity, spending/abuse controls, organization-approved privacy and retention, monitoring and access governance. The app currently sends no credentials to external FastAPI. Any production authentication integration must update both the service and browser caller together. Never weaken authentication to make a public endpoint work.

The app anonymizes by default, but Backend mode can turn input masking off. This kit receives exactly what the browser sends and does not claim additional server-side anonymization. Inspect the prepared log; do not send sensitive data with masking disabled. Model diagnoses remain hypotheses that need engineer review.

Service-rule tests cover missing credentials, the 50,000-character limit, origin rejection and no demo fallback. A live diagnosis still requires your provider credentials and model access; these tests do not establish either.
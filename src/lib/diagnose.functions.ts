import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  errorLog: z.string().min(1).max(50000),
  apiBaseUrl: z.string().trim().min(1).max(500),
});

const diagnosisSchema = z.object({
  root_cause: z.string(),
  severity: z.string(),
  recommended_action: z.string(),
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;

export type DiagnoseResult =
  | { ok: true; diagnosis: Diagnosis }
  | { ok: false; error: string };

export const diagnoseLog = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<DiagnoseResult> => {
    const base = data.apiBaseUrl.replace(/\/+$/, "");

    let response: Response;
    try {
      response = await fetch(`${base}/api/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error_log: data.errorLog }),
      });
    } catch {
      return {
        ok: false,
        error:
          "Backend unreachable. Make sure the Python FastAPI server is running on port 8000.",
      };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: `The diagnosis service returned ${response.status}. ${body.slice(0, 300)}`.trim(),
      };
    }

    const parsed = diagnosisSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      return {
        ok: false,
        error:
          "The service responded, but not with the expected fields (root_cause, severity, recommended_action).",
      };
    }

    return { ok: true, diagnosis: parsed.data };
  });

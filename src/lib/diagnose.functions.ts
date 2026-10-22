import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { maskSensitive } from './log-processing';
import { type Diagnosis } from './diagnosis';
export { diagnosisSchema, type Diagnosis } from './diagnosis';

export type DiagnoseResult =
  | { ok: true; diagnosis: Diagnosis }
  | { ok: false; error: string };

export const diagnoseLog = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ errorLog: z.string().min(1).max(50000) }).parse(data))
  .handler(async ({ data }): Promise<DiagnoseResult> => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { ok: false, error: 'Hosted AI is not configured. Demo remains available.' };
    try {
      const { analyzeHosted } = await import('./hosted-ai.server');
      return { ok: true, diagnosis: await analyzeHosted(maskSensitive(data.errorLog).text, apiKey) };
    } catch (error) {
      const status = error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 0;
      const safeMessage = error && typeof error === 'object' && 'safeMessage' in error && typeof error.safeMessage === 'string' ? error.safeMessage : null;
      console.error('Hosted diagnosis failed', { status });
      return { ok: false, error: safeMessage ?? (status === 402 ? 'AI credits are unavailable. Check Plans & credits before trying again.' : status === 403 ? 'AI access is blocked. An administrator must restore access.' : status === 429 ? 'AI is busy. Please wait before trying again.' : 'Hosted AI could not complete this diagnosis. Your log is preserved; check service availability before a fresh request.') };
    }
  });

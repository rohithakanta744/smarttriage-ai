import { z } from 'zod';
import { maskSensitive } from './log-processing';

export const diagnosisSchema = z.object({
  root_cause: z.string().max(16000),
  severity: z.string().max(40),
  recommended_action: z.string().max(16000),
  confidence: z.number().min(0).max(100).optional(),
  evidence_lines: z.array(z.number().int().positive()).max(100).optional(),
});
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export function maskDiagnosis(diagnosis: Diagnosis): Diagnosis {
  return { ...diagnosis, root_cause: maskSensitive(diagnosis.root_cause).text, severity: maskSensitive(diagnosis.severity).text, recommended_action: maskSensitive(diagnosis.recommended_action).text };
}
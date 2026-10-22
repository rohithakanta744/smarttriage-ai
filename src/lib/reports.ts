import type { Diagnosis } from './diagnose.functions';
import { maskSensitive } from './log-processing';

export function buildReport(diagnosis: Diagnosis, log: string, postmortem = false) {
  const lines = log.split('\n');
  const cited = diagnosis.evidence_lines?.filter(n => n <= lines.length).map(n => `${n}: ${lines[n-1]}`).join('\n') ?? '';
  const base = `# SmartTriage AI incident report\n\nSeverity: ${diagnosis.severity}\n${diagnosis.confidence !== undefined ? `\nModel-estimated confidence: ${diagnosis.confidence}% (not calibrated)\n` : ''}\n## Root cause\n${diagnosis.root_cause}\n\n## Recommended action\n${diagnosis.recommended_action}\n\n## Cited submitted lines\n${cited || 'No line references supplied.'}\n\n## Evidence excerpt${log.length > 5000 ? ' (truncated to 5,000 characters)' : ''}\n\`\`\`text\n${log.slice(0, 5000)}\n\`\`\``;
  return maskSensitive(base + (postmortem ? '\n\n## Post-mortem draft\nIncident owner: [assign]\nStart / resolution time: [confirm]\nCustomer impact: [confirm]\n\n### Timeline\n- Detection: [time and alert]\n- Mitigation: [action and time]\n- Resolution: [validation]\n\n### Contributing factors\n[Review with incident team]\n\n### Follow-up actions\n- [ ] Confirm root cause with evidence\n- [ ] Add regression coverage\n- [ ] Assign prevention work and due dates\n' : '')).text;
}
export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
export async function downloadPdf(report: string) {
  const { jsPDF } = await import('jspdf'); const pdf = new jsPDF(); pdf.setFont('helvetica'); pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(report, 175) as string[]; let y = 18;
  for (const line of lines) { if (y > 280) { pdf.addPage(); y = 18; } pdf.text(line, 18, y); y += 5; }
  pdf.save('smarttriage-report.pdf');
}
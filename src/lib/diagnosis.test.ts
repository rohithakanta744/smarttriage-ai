import { describe, expect, it } from 'vitest';
import { maskDiagnosis } from './diagnosis';
import { buildReport } from './reports';
import { channelPayload, validateWebhook } from './workspace.functions';

describe('report privacy and channel rules', () => {
  it('masks fields without corrupting quoted JSON strings', () => {
    const result = maskDiagnosis({ severity:'HIGH',root_cause:'password="private" and alice@example.com',recommended_action:'Check 192.168.1.8' });
    expect(result.root_cause).toBe('[SECRET]" and [EMAIL]');
    expect(result.recommended_action).toBe('Check [IP]');
  });
  it('exports masked incident evidence and conclusions', () => {
    const text = buildReport({severity:'HIGH',root_cause:'alice@example.com failed',recommended_action:'Check api_key=private'},'Bearer abc.def');
    expect(text).not.toContain('alice@example.com'); expect(text).not.toContain('private'); expect(text).not.toContain('abc.def');
  });
  it('rejects private hosts and misleading webhook suffixes', () => {
    expect(() => validateWebhook('https://127.0.0.1/post','teams')).toThrow();
    expect(() => validateWebhook('https://hooks.slack.com.evil.test/services/a','slack')).toThrow();
    expect(() => validateWebhook('https://user:secret@hooks.slack.com/services/a','slack')).toThrow();
  });
  it('accepts official Slack and Teams workflow URLs', () => {
    expect(validateWebhook('https://hooks.slack.com/services/T/B/token','slack')).toBe('https://hooks.slack.com/services/T/B/token');
    expect(validateWebhook('https://prod-01.westus.logic.azure.com/workflows/id/triggers/manual/paths/invoke','teams')).toContain('.logic.azure.com');
  });
  it('masks outgoing Teams and Slack payloads', () => {
    for (const provider of ['teams','slack'] as const) {
      const payload = JSON.stringify(channelPayload(provider,'alice@example.com Bearer secret'));
      expect(payload).toContain('[EMAIL]'); expect(payload).toContain('[TOKEN]'); expect(payload).not.toContain('alice@example.com');
    }
  });
});
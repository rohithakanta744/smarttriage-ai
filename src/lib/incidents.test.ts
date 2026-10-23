import { describe, expect, it } from 'vitest';
import { splitIncidents } from './incidents';
describe('multi-error scanning', () => {
  it('keeps unrelated errors separate with their stack context', () => {
    const found = splitIncidents('INFO ready\nERROR database refused\n  at connect\nCRITICAL certificate expired\n  at tls');
    expect(found).toHaveLength(2); expect(found[0]?.firstLine).toBe(2); expect(found[0]?.log).toContain('at connect'); expect(found[1]?.log).not.toContain('database');
  });
  it('groups repeated signatures without discarding occurrences', () => { const found = splitIncidents('ERROR timeout 101\nERROR timeout 102'); expect(found).toHaveLength(1); expect(found[0]?.log).toContain('102'); });
});
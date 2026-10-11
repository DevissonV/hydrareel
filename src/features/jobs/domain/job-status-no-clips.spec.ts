import { describe, expect, it } from 'vitest';
import { assertTransition, isTerminal } from './job-status';
describe('NO_CLIPS editorial result', () => {
  it('can finish analysis without rendering when no moments are approved', () => {
    expect(() => assertTransition('ANALYZING', 'NO_CLIPS')).not.toThrow();
    expect(isTerminal('NO_CLIPS')).toBe(true);
    expect(() => assertTransition('NO_CLIPS', 'RENDERING')).toThrow();
  });
  it('can promote a manually recovered clip without restarting the job', () => {
    expect(() => assertTransition('NO_CLIPS', 'COMPLETED')).not.toThrow();
  });
});

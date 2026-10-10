import { describe, expect, it } from 'vitest';
import { assertTransition, isTerminal } from './job-status';

describe('cancellation state', () => {
  it('allows cancellation from upload, queue, transcription, analysis and rendering', () => {
    for (const state of ['UPLOADING', 'UPLOADED', 'TRANSCRIBING', 'ANALYZING', 'RENDERING'] as const) {
      expect(() => assertTransition(state, 'CANCELLED')).not.toThrow();
    }
  });

  it('keeps cancellation terminal so recovery cannot resume it', () => {
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(() => assertTransition('CANCELLED', 'UPLOADED')).toThrow();
    expect(() => assertTransition('CANCELLED', 'COMPLETED')).toThrow();
  });
});

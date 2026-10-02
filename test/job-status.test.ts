import { describe, expect, it } from 'vitest';
import { Job } from '../src/features/jobs/domain/job.entity';

describe('job state machine', () => {
  it('permite flujo válido', () => {
    const job = new Job('1', 'a.mp4', 'sources/1/source.mp4', 'video/mp4');
    for (const state of ['UPLOADED','TRANSCRIBING','ANALYZING','RENDERING','COMPLETED'] as const) job.transition(state);
    expect(job.status).toBe('COMPLETED');
  });
  it('bloquea saltos inválidos', () => {
    const job = new Job('1', 'a.mp4', 'sources/1/source.mp4', 'video/mp4');
    expect(() => job.transition('RENDERING')).toThrow();
  });
});

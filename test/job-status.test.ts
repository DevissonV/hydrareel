import { describe, expect, it } from 'vitest';
import { Job } from '../src/features/jobs/domain/job.entity';

describe('job state machine', () => {
  it('permite flujo válido', () => {
    const job = new Job('1', 'a.mp4', 'sources/1/source.mp4', 'video/mp4', '11111111-1111-4111-8111-111111111111');
    for (const state of ['UPLOADED','TRANSCRIBING','ANALYZING','RENDERING','COMPLETED'] as const) job.transition(state);
    expect(job.status).toBe('COMPLETED');
  });
  it('restaura estado durable', () => {
    const job = new Job('2', 'b.mp4', 'sources/2/source.mp4', 'video/mp4', '22222222-2222-4222-8222-222222222222');
    job.transition('UPLOADED');
    job.transition('TRANSCRIBING');
    const restored = Job.restore(job.toSnapshot());
    expect(restored.id).toBe(job.id);
    expect(restored.status).toBe('TRANSCRIBING');
    expect(restored.clientId).toBe(job.clientId);
  });

  it('bloquea saltos inválidos', () => {
    const job = new Job('1', 'a.mp4', 'sources/1/source.mp4', 'video/mp4');
    expect(() => job.transition('RENDERING')).toThrow();
  });
});

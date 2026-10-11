import { describe, expect, it, vi } from 'vitest';
import { ProcessJobUseCase } from './process-job.use-case';
import { Job } from '../domain/job.entity';

describe('end-to-end state for empty editorial review', () => {
  it('persists NO_CLIPS with explanation, never runs FFmpeg and never claims COMPLETED', async () => {
    const job = new Job('test-job', 'video.mp4', 'sources/test-job/video.mp4', 'video/mp4', 'test-client');
    job.transition('UPLOADED');
    const transcript = {
      duration: 147, text: 'Un video', words: [],
      segments: [{ start: 0, end: 10, text: 'Un video' }], model: 'mock',
    };
    const candidate = {
      startSeconds: 0, endSeconds: 20, title: 'Momento', hook: 'Mira esto',
      reason: 'Editorial', socialCaption: 'Un texto', hashtags: ['#viral', '#fyp', '#corto', '#reel', '#video'],
      emphasisTerms: [], score: 80,
    };
    const storage = {
      downloadToFile: vi.fn(async () => undefined),
      getJson: vi.fn(async () => { throw new Error('No cache'); }),
      putJson: vi.fn(async (_key: string, _data: unknown) => undefined),
    };
    const brain = {
      select: vi.fn(async () => ({ clips: [candidate], usage: { total_tokens: 100 } })),
      selectMore: vi.fn(async () => ({ clips: [{ ...candidate, startSeconds: 40, endSeconds: 60 }], usage: { total_tokens: 50 } })),
      review: vi.fn(async () => ({ clips: [], usage: { rejected: 1, rejectionReasons: ['No hay cierre narrativo'] } })),
    };
    const rendering = { render: vi.fn() };
    const useCase = Object.create(ProcessJobUseCase.prototype) as any;
    Object.assign(useCase, {
      config: { maxVideoMinutes: 30, openaiClipModel: 'mock' },
      jobs: { get: vi.fn(async () => job), save: vi.fn(async () => undefined) },
      storage,
      media: { probe: vi.fn(async () => ({ durationSeconds: 147, width: 478, height: 850, hasAudio: true })),
        extractAudio: vi.fn(async () => undefined) },
      transcription: { transcribe: vi.fn(async () => transcript) },
      clipBrain: brain,
      rendering,
      activeRenderControllers: new Map(),
      renderGate: { acquire: vi.fn(async () => vi.fn()) },
    });
    await useCase.run('test-job');
    expect(job.status).toBe('NO_CLIPS');
    expect(job.clips).toHaveLength(0);
    expect(job.error).toContain('No hay cierre narrativo');
    expect(brain.selectMore).toHaveBeenCalledTimes(1);
    expect(brain.review).toHaveBeenCalledTimes(2);
    expect(rendering.render).not.toHaveBeenCalled();
    const savedManifest = storage.putJson.mock.calls.find(([key]) => String(key).startsWith('clients/'));
    expect(savedManifest).toBeTruthy();
    expect(savedManifest?.[1]).toMatchObject({ clips: [], editorialReasons: ['No hay cierre narrativo', 'No hay cierre narrativo'] });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { RegenerateClipUseCase } from './regenerate-clip.use-case';
import { buildCompositionPlan } from '../../rendering/domain/composition';

describe('manual recovery for existing NO_CLIPS projects', () => {
  it('turns a previously exhausted 28-second project into one TikTok-safe rendered clip', async () => {
    const clientId = '11111111-1111-4111-8111-111111111111';
    const jobId = '22222222-2222-4222-8222-222222222222';
    const transcript = {
      duration: 28, model: 'mock', text: 'Este plato tiene arroz frijoles y ensalada',
      words: [
        { word: 'Este', start: 1, end: 1.4 },
        { word: 'plato', start: 2, end: 2.5 },
        { word: 'tiene', start: 3, end: 3.5 },
        { word: 'arroz', start: 4, end: 4.5 },
        { word: 'frijoles', start: 5, end: 5.7 },
        { word: 'ensalada', start: 7, end: 8 },
      ],
      segments: [{ start: 1, end: 26, text: 'Este plato tiene arroz frijoles y ensalada' }],
    };
    const selected = {
      startSeconds: 0, endSeconds: 26,
      title: 'Mi plato', hook: 'Así quedó el plato', reason: 'Video útil',
      socialCaption: 'Un almuerzo fácil.', hashtags: ['#viral', '#fyp', '#comida', '#cocina', '#recetas'],
      emphasisTerms: [], score: 45,
    };
    const manifest = {
      id: jobId, clientId, sourceKey: 'sources/' + jobId + '/original.mp4',
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), clips: [],
      editorialCache: { candidates: [], exhausted: true, updatedAt: new Date().toISOString() },
    };
    const job = {
      id: jobId, clientId, clips: [], status: 'NO_CLIPS', error: 'Sin clips',
      transition(next: string) { this.status = next; },
    };
    const storage = {
      getJson: vi.fn(async (key: string) => key.startsWith('clients/') ? manifest : transcript),
      putJson: vi.fn(async () => undefined),
      downloadToFile: vi.fn(async () => undefined),
      uploadFile: vi.fn(async () => undefined),
    };
    const brain = {
      select: vi.fn(async () => ({ clips: [selected] })),
      selectMore: vi.fn(async () => ({ clips: [] })),
      review: vi.fn(async () => ({ clips: [], usage: { rejected: 1 } })),
    };
    const render = vi.fn(async () => undefined);
    const useCase = Object.create(RegenerateClipUseCase.prototype) as any;
    Object.assign(useCase, {
      storage, clipBrain: brain,
      jobs: { get: vi.fn(async () => job), save: vi.fn(async () => undefined) },
      renderGate: { acquire: vi.fn(async () => () => undefined) },
      media: {
        probe: vi.fn(async (file: string) => file.includes('output-')
          ? { width: 1080, height: 1920, hasAudio: true, videoCodec: 'h264', audioCodec: 'aac', durationSeconds: 26 }
          : { width: 720, height: 1280, hasAudio: true, videoCodec: 'h264', audioCodec: 'aac', durationSeconds: 28 }),
      },
      rendering: {
        createPlan: vi.fn(() => ({
          composition: buildCompositionPlan(transcript, selected, 'tiktok'),
          silenceCuts: 0, removedSeconds: 0, punchIns: [],
          audioPolished: false, colorPolished: false,
        })),
        writeSubtitles: vi.fn(async () => 4),
        render,
      },
    });

    const outcome = await useCase.findMoreNow(clientId, jobId);
    expect(outcome.added).toBe(1);
    expect(job.status).toBe('COMPLETED');
    expect(job.error).toBeUndefined();
    expect(brain.select).toHaveBeenCalledOnce();
    expect(brain.selectMore).not.toHaveBeenCalled();
    expect(brain.review).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledOnce();
    expect(manifest.clips).toHaveLength(1);
    expect(outcome.clips[0].preflight.status).toBe('PASS');
    expect(manifest.editorialCache.bestEffortAttempted).toBe(true);
  });
});

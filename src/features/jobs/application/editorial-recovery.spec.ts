import { describe, expect, it, vi } from 'vitest';
import { selectWithEditorialRecovery } from './editorial-recovery';
import type { ClipBrainPort } from '../../clip-brain/application/clip-brain.port';
import type { Transcript } from '../../transcription/domain/transcript';

const transcript = { duration: 150, text: 'Prueba', words: [], segments: [] } as unknown as Transcript;
const clip = {
  startSeconds: 0, endSeconds: 20, title: 'Momento', hook: 'Mira esto',
  reason: 'Historia completa', socialCaption: 'Texto', hashtags: ['#viral', '#fyp', '#video', '#reels', '#corto'],
  emphasisTerms: [], score: 75,
};
const result = (clips: typeof clip[]) => ({ clips });

describe('editorial recovery', () => {
  it('does not spend on recovery when first candidates are approved', async () => {
    const brain = {
      select: vi.fn(async () => result([clip])),
      review: vi.fn(async () => result([clip])),
      selectMore: vi.fn(async () => result([])),
    } as unknown as ClipBrainPort;
    const outcome = await selectWithEditorialRecovery(brain, transcript);
    expect(outcome.reviewed.clips).toHaveLength(1);
    expect(outcome.recovery).toBeUndefined();
    expect(brain.selectMore).not.toHaveBeenCalled();
    expect(brain.review).toHaveBeenCalledTimes(1);
  });
  it('tries one alternative and requires QA to approve it', async () => {
    const brain = {
      select: vi.fn(async () => result([clip])),
      selectMore: vi.fn(async () => result([{ ...clip, startSeconds: 40, endSeconds: 60 }])),
      review: vi.fn().mockResolvedValueOnce(result([])).mockResolvedValueOnce(result([{ ...clip, startSeconds: 40, endSeconds: 60 }])),
    } as unknown as ClipBrainPort;
    const outcome = await selectWithEditorialRecovery(brain, transcript);
    expect(outcome.reviewed.clips).toHaveLength(1);
    expect(outcome.recovery?.initialReview.clips).toHaveLength(0);
    expect(brain.selectMore).toHaveBeenCalledOnce();
    expect(brain.selectMore).toHaveBeenCalledWith(transcript, [clip], 2);
    expect(brain.review).toHaveBeenCalledTimes(2);
  });
  it('never publishes unapproved clips and never retries more than once', async () => {
    const brain = {
      select: vi.fn(async () => result([clip])),
      selectMore: vi.fn(async () => result([clip])),
      review: vi.fn(async () => result([])),
    } as unknown as ClipBrainPort;
    const outcome = await selectWithEditorialRecovery(brain, transcript);
    expect(outcome.reviewed.clips).toHaveLength(0);
    expect(brain.selectMore).toHaveBeenCalledOnce();
    expect(brain.review).toHaveBeenCalledTimes(2);
  });
  it('renders a best-effort TikTok-safe clip from a 28-second upload without another AI call', async () => {
    const shortTranscript = {
      duration: 28, model: 'mock', text: 'Este plato lleva arroz frijoles carne y ensalada',
      words: [
        { word: 'Este', start: 0.2, end: 0.6 },
        { word: 'plato', start: 0.7, end: 1.2 },
        { word: 'lleva', start: 1.3, end: 1.7 },
        { word: 'arroz', start: 2, end: 2.5 },
        { word: 'frijoles', start: 3, end: 3.8 },
        { word: 'carne', start: 5, end: 5.6 },
        { word: 'ensalada', start: 7, end: 8 },
      ],
      segments: [{ start: 0.2, end: 28, text: 'Este plato lleva arroz frijoles carne y ensalada' }],
    } as Transcript;
    const brain = {
      select: vi.fn(async () => result([{ ...clip, startSeconds: 0, endSeconds: 27, score: 45 }])),
      review: vi.fn(async () => result([])),
      selectMore: vi.fn(async () => result([])),
    } as unknown as ClipBrainPort;
    const outcome = await selectWithEditorialRecovery(brain, shortTranscript);
    expect(outcome.reviewed.clips).toHaveLength(1);
    expect(outcome.reviewed.usage).toMatchObject({ mode: 'best_effort' });
    expect(brain.selectMore).not.toHaveBeenCalled();
    expect(brain.review).toHaveBeenCalledOnce();
    const { buildCompositionPlan, buildLayoutPreflight } = await import('../../rendering/domain/composition');
    const plan = buildCompositionPlan(shortTranscript, outcome.reviewed.clips[0], 'tiktok');
    expect(buildLayoutPreflight(plan).status).toBe('PASS');
    expect(plan.hook.y).toBeGreaterThanOrEqual(plan.safeZone.top);
    expect(plan.caption.dialogueY).toBeLessThan(1920 - plan.safeZone.bottom);
  });

  it('rescues the highest-scored usable clip after both reviews reject a long video', async () => {
    const longTranscript = {
      duration: 150, model: 'mock', text: 'Tengo tres cosas que contar',
      words: [
        { word: 'Tengo', start: 1, end: 1.5 },
        { word: 'tres', start: 2, end: 2.4 },
        { word: 'cosas', start: 3, end: 3.5 },
        { word: 'que', start: 41, end: 41.4 },
        { word: 'contar', start: 42, end: 42.6 },
        { word: 'ahora', start: 43, end: 43.6 },
      ],
      segments: [
        { start: 0, end: 20, text: 'Tengo tres cosas' },
        { start: 40, end: 60, text: 'Que contar ahora' },
      ],
    } as Transcript;
    const alternative = { ...clip, startSeconds: 40, endSeconds: 60, score: 92 };
    const brain = {
      select: vi.fn(async () => result([{ ...clip, score: 47 }])),
      selectMore: vi.fn(async () => result([alternative])),
      review: vi.fn(async () => result([])),
    } as unknown as ClipBrainPort;
    const outcome = await selectWithEditorialRecovery(brain, longTranscript);
    expect(outcome.reviewed.clips).toHaveLength(1);
    expect(outcome.reviewed.clips[0].startSeconds).toBe(40);
    expect(outcome.reviewed.usage).toMatchObject({ mode: 'best_effort' });
    expect(brain.review).toHaveBeenCalledTimes(2);
    expect(brain.selectMore).toHaveBeenCalledOnce();
  });

  it('does not fabricate a clip without usable speech', async () => {
    const brain = {
      select: vi.fn(async () => result([clip])),
      selectMore: vi.fn(async () => result([])),
      review: vi.fn(async () => result([])),
    } as unknown as ClipBrainPort;
    const outcome = await selectWithEditorialRecovery(brain, transcript);
    expect(outcome.reviewed.clips).toHaveLength(0);
  });

});

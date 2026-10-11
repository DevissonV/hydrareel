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
});

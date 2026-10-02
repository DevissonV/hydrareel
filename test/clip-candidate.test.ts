import { describe, expect, it } from 'vitest';
import { clipPolicyForDuration, validateAndNormalizeCandidates } from '../src/features/clip-brain/domain/clip-candidate';

describe('clip policy and candidate validation', () => {
  it('adapta duración y cantidad al tamaño del video', () => {
    expect(clipPolicyForDuration(7.9, 20, 60, 3).maxClips).toBe(0);

    const short = clipPolicyForDuration(46.2, 20, 60, 3);
    expect(short).toEqual({ minSeconds: 8, maxSeconds: 30, maxClips: 3 });

    const medium = clipPolicyForDuration(120, 20, 60, 3);
    expect(medium).toEqual({ minSeconds: 12, maxSeconds: 45, maxClips: 3 });

    const long = clipPolicyForDuration(600, 20, 60, 3);
    expect(long).toEqual({ minSeconds: 20, maxSeconds: 60, maxClips: 3 });
  });

  it('permite devolver menos clips que el máximo si solo hay uno bueno', () => {
    const result = validateAndNormalizeCandidates({ clips: [
      { startSeconds: 10, endSeconds: 26, title: 'Único momento fuerte', hook: 'h', reason: 'r', score: 90 }
    ]}, 8, 30, 46.2, 3);
    expect(result).toHaveLength(1);
  });

  it('filtra duración y solapamientos', () => {
    const result = validateAndNormalizeCandidates({ clips: [
      { startSeconds: 10, endSeconds: 40, title: 'A', hook: 'h', reason: 'r', score: 90 },
      { startSeconds: 20, endSeconds: 50, title: 'B', hook: 'h', reason: 'r', score: 80 },
      { startSeconds: 70, endSeconds: 100, title: 'C', hook: 'h', reason: 'r', score: 70 }
    ]}, 20, 60, 200, 3);
    expect(result).toHaveLength(2);
    expect(result.map(x => x.title)).toEqual(['A','C']);
  });

  it('rechaza JSON inválido', () => {
    expect(() => validateAndNormalizeCandidates({ clips: [{ startSeconds: 'x' }] }, 20, 60, 100, 3)).toThrow();
  });
});

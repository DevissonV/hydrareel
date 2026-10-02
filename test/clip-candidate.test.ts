import { describe, expect, it } from 'vitest';
import { maxClipsForDuration, validateAndNormalizeCandidates } from '../src/features/clip-brain/domain/clip-candidate';

describe('clip candidate parsing and limits', () => {
  it('calcula el máximo dinámico por duración', () => {
    expect(maxClipsForDuration(19.9, 20, 3)).toBe(0);
    expect(maxClipsForDuration(39, 20, 3)).toBe(1);
    expect(maxClipsForDuration(46.2, 20, 3)).toBe(2);
    expect(maxClipsForDuration(84.9, 20, 3)).toBe(3);
    expect(maxClipsForDuration(600, 20, 3)).toBe(3);
  });

  it('permite devolver menos clips que el máximo si no hay más candidatos buenos', () => {
    const result = validateAndNormalizeCandidates({ clips: [
      { startSeconds: 10, endSeconds: 40, title: 'Único momento fuerte', hook: 'h', reason: 'r', score: 90 }
    ]}, 20, 60, 120, 3);
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

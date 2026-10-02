import { describe, expect, it } from 'vitest';
import { validateAndNormalizeCandidates } from '../src/features/clip-brain/domain/clip-candidate';

describe('clip candidate parsing and limits', () => {
  it('filtra duración y solapamientos', () => {
    const result = validateAndNormalizeCandidates({ clips: [
      { startSeconds: 10, endSeconds: 40, title: 'A', hook: 'h', reason: 'r', score: 90 },
      { startSeconds: 20, endSeconds: 50, title: 'B', hook: 'h', reason: 'r', score: 80 },
      { startSeconds: 70, endSeconds: 100, title: 'C', hook: 'h', reason: 'r', score: 70 },
      { startSeconds: 120, endSeconds: 130, title: 'D', hook: 'h', reason: 'r', score: 60 }
    ]}, 20, 60, 200, 3);
    expect(result).toHaveLength(2);
    expect(result.map(x => x.title)).toEqual(['A','C']);
  });
  it('rechaza JSON inválido', () => {
    expect(() => validateAndNormalizeCandidates({ clips: [{ startSeconds: 'x' }] }, 20, 60, 100, 3)).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import {
  assertCompositionSafe,
  buildCompositionPlan,
  decideCaptionPolicy,
  editorialRoleForCue,
  selectVisualIdentity,
  shouldRenderCue,
} from '../src/features/rendering/domain/composition';
import { ClipCandidate } from '../src/features/clip-brain/domain/clip-candidate';
import { Transcript } from '../src/features/transcription/domain/transcript';

function clip(overrides: Partial<ClipCandidate> = {}): ClipCandidate {
  return {
    startSeconds: 0,
    endSeconds: 20,
    title: 'Una historia útil',
    hook: 'Esto cambia todo',
    reason: 'momento fuerte',
    socialCaption: 'copy',
    hashtags: ['#viral', '#fyp', '#historia', '#barberia', '#clientes'],
    emphasisTerms: ['gratis'],
    score: 90,
    ...overrides,
  };
}

function transcript(words: Transcript['words'], duration = 20): Transcript {
  return {
    text: words.map((word) => word.word).join(' '),
    duration,
    model: 'test',
    segments: [{ start: 0, end: duration, text: 'test' }],
    words,
  };
}

describe('adaptive editorial composition', () => {
  it('mantiene hook y captions dentro de la safe zone de TikTok', () => {
    const words = Array.from({ length: 45 }, (_, index) => ({
      word: index === 36 ? 'gratis' : `w${index}`,
      start: index * 0.4,
      end: index * 0.4 + 0.24,
    }));
    const plan = buildCompositionPlan(transcript(words), clip(), 'tiktok');

    expect(plan.platform).toBe('tiktok');
    expect(plan.captionPolicy).toBe('FULL');
    expect(plan.hook.y).toBeGreaterThanOrEqual(plan.safeZone.top);
    expect(plan.caption.dialogueY).toBeGreaterThan(plan.subjectCorridor.bottom);
    expect(plan.caption.dialogueY).toBeLessThan(1920 - plan.safeZone.bottom);
    expect(() => assertCompositionSafe(plan)).not.toThrow();
  });

  it('no llena un video visual con subtítulos permanentes', () => {
    const sparse = transcript([
      { word: 'mira', start: 1, end: 1.3 },
      { word: 'esto', start: 9, end: 9.3 },
      { word: 'wow', start: 17, end: 17.3 },
    ]);
    expect(decideCaptionPolicy(sparse, clip({ emphasisTerms: [] }))).toBe('HOOK_ONLY');
  });

  it('trata un énfasis tardío como punchline y lo conserva en modo selectivo', () => {
    const candidate = clip({ emphasisTerms: ['gratis'] });
    const words = [
      { word: 'es', start: 14, end: 14.2 },
      { word: 'gratis!', start: 14.21, end: 14.6 },
    ];
    const role = editorialRoleForCue(words, 14, 14.6, candidate);

    expect(role).toBe('PUNCHLINE');
    expect(shouldRenderCue('KEY_MOMENTS', role, 3)).toBe(true);
    expect(shouldRenderCue('KEY_MOMENTS', 'DIALOGUE', 3)).toBe(false);
  });

  it('elige identidad visual por semántica sin rotar plantillas al azar', () => {
    expect(selectVisualIdentity(clip({ hashtags: ['#viral', '#fyp', '#humor'] }))).toBe('pulse');
    expect(selectVisualIdentity(clip({ hashtags: ['#viral', '#fyp', '#tutorial'] }))).toBe('clean');
    expect(selectVisualIdentity(clip({ hashtags: ['#viral', '#fyp', '#futbol'] }))).toBe('neon');
  });
});

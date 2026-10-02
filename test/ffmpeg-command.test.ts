import { describe, expect, it } from 'vitest';
import { buildCaptionCues, buildMagicEditPlan, buildRenderArgs } from '../src/features/rendering/infrastructure/ffmpeg-rendering.adapter';

describe('ffmpeg render command', () => {
  it('fuerza vertical H264 AAC y subtítulos ASS', () => {
    const args = buildRenderArgs('/tmp/source.mp4', '/tmp/out.mp4', '/tmp/captions.ass', {
      startSeconds: 10, endSeconds: 40, title: 'x', hook: 'x', reason: 'x', socialCaption: 'copy', hashtags: ['#x'], emphasisTerms: ['riesgo'], score: 80,
    });
    const joined = args.join(' ');
    expect(joined).toContain('crop=1080:1920');
    expect(joined).toContain('subtitles=');
    expect(joined).toContain('libx264');
    expect(joined).toContain('aac');
    const seeks = args.reduce<number[]>((acc, value, index) => value === '-ss' ? [...acc, index] : acc, []);
    expect(seeks).toHaveLength(1);
    expect(seeks[0]).toBeLessThan(args.indexOf('-i'));
    expect(joined).toContain('trim=start=');
    expect(joined).toContain('setpts=PTS-STARTPTS');
    expect(joined).toContain('atrim=start=');
    expect(joined).toContain('asetpts=PTS-STARTPTS');
    expect(joined).toContain('aresample=async=1:first_pts=0');
    expect(args.at(-1)).toBe('/tmp/out.mp4');
  });

  it('usa composición subject-safe para fuentes horizontales', () => {
    const args = buildRenderArgs('/tmp/source.mp4', '/tmp/out.mp4', '/tmp/captions.ass', {
      startSeconds: 10, endSeconds: 40, title: 'x', hook: 'x', reason: 'x', socialCaption: 'copy', hashtags: ['#x'], emphasisTerms: ['riesgo'], score: 80,
    }, { sourceWidth: 1920, sourceHeight: 1080, hook: 'x', captionStyle: 'pulse' });
    const joined = args.join(' ');
    expect(joined).toContain('gblur=sigma=32');
    expect(joined).toContain('overlay=(W-w)/2:(H-h)/2');
  });

  it('comprime pausas largas y conserva énfasis editorial', () => {
    const transcript = {
      text: 'Esto cambia el riesgo completamente',
      duration: 8,
      model: 'test',
      segments: [{ start: 0, end: 8, text: 'Esto cambia el riesgo completamente' }],
      words: [
        { word: 'Esto', start: 0.2, end: 0.5 },
        { word: 'cambia', start: 0.55, end: 0.9 },
        { word: 'el', start: 2.2, end: 2.35 },
        { word: 'riesgo', start: 3.0, end: 3.45 },
        { word: 'completamente', start: 3.5, end: 4.2 },
      ],
    };
    const clip = {
      startSeconds: 0, endSeconds: 6, title: 'x', hook: 'x', reason: 'x',
      socialCaption: 'copy', hashtags: ['#x'], emphasisTerms: ['riesgo'], score: 90,
    };
    const plan = buildMagicEditPlan(transcript, clip);
    expect(plan.silenceCuts).toBeGreaterThanOrEqual(1);
    expect(plan.removedSeconds).toBeGreaterThan(0);
    expect(plan.emphasisTerms).toEqual(['riesgo']);
    expect(plan.outputDuration).toBeLessThan(6);
  });

  it('genera captions cortos y como máximo dos líneas', () => {
    const words = [
      ['Bueno',0,0.3],['mi',0.31,0.48],['gente',0.49,0.8],['hoy',0.82,1.1],
      ['quiero',1.12,1.42],['contarles',1.43,1.82],['algo',1.83,2.1],['importante',2.11,2.7],
      ['porque',3.3,3.6],['esto',3.61,3.9],['sí',3.91,4.1],['tiene',4.11,4.35],['sentido',4.36,4.8],
    ].map(([word,start,end]) => ({ word:String(word), start:Number(start), end:Number(end) }));

    const cues = buildCaptionCues(words, {
      startSeconds: 0, endSeconds: 6, title: 'x', hook: 'x', reason: 'x', socialCaption: 'copy', hashtags: ['#x'], emphasisTerms: ['riesgo'], score: 90,
    });

    expect(cues.length).toBeGreaterThan(1);
    for (const cue of cues) {
      expect((cue.text.match(/\\N/g) ?? []).length).toBeLessThanOrEqual(1);
      expect(cue.end).toBeGreaterThan(cue.start);
    }
  });
});

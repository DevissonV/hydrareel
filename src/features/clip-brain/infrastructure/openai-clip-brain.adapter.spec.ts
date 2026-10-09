import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiClipBrainAdapter } from './openai-clip-brain.adapter';

const candidate = {
  startSeconds: 0, endSeconds: 12, title: 'Una historia',
  hook: 'Mira esto', reason: 'Tiene desenlace', socialCaption: 'Una historia real',
  hashtags: ['#viral', '#fyp', '#historia', '#reels', '#contenido'],
  emphasisTerms: [], score: 80,
};
const transcript = {
  duration: 25,
  text: 'Una historia con inicio y cierre',
  model: 'test',
  words: [
    { start: 0, end: 1, word: 'Una' },
    { start: 11, end: 12, word: 'historia.' },
  ],
  segments: [{ start: 0, end: 12, text: 'Una historia' }],
};
const adapter = () => new OpenAiClipBrainAdapter({
  openaiApiKey: 'test', openaiBaseUrl: 'https://example.invalid',
  openaiClipModel: 'test', minClipSeconds: 8,
  maxClipSeconds: 60, maxClipsPerJob: 3,
} as any);
const response = (items: unknown[]) => ({
  ok: true,
  text: async () => JSON.stringify({ output_text: JSON.stringify({ clips: items }) }),
});

afterEach(() => vi.unstubAllGlobals());

describe('editorial approval gate', () => {
  it('never publishes a candidate explicitly rejected by editorial QA', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{
      candidateIndex: 0, approved: false, startSegmentIndex: 0,
      endSegmentIndex: 0, title: 'Una historia', reason: 'No publicable', score: 80,
    }])));
    const result = await adapter().review(transcript as any, [candidate]);
    expect(result.clips).toEqual([]);
    expect((result.usage as any).rejected).toBe(1);
  });

  it('preserves approved original when requested timing change is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{
      candidateIndex: 0, approved: true, startSegmentIndex: 999,
      endSegmentIndex: 999, title: 'Una historia', reason: 'Aprobado', score: 80,
    }])));
    const result = await adapter().review(transcript as any, [candidate]);
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].startSeconds).toBe(0);
    expect((result.usage as any).keptOriginal).toBe(1);
  });

  it('reports editorial service failure independently from explicit rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(adapter().review(transcript as any, [candidate]))
      .rejects.toThrow('Control de calidad editorial no disponible');
  });
});

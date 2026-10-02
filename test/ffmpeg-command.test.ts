import { describe, expect, it } from 'vitest';
import { buildRenderArgs } from '../src/features/rendering/infrastructure/ffmpeg-rendering.adapter';

describe('ffmpeg render command', () => {
  it('fuerza vertical H264 AAC y subtítulos', () => {
    const args = buildRenderArgs('/tmp/source.mp4', '/tmp/out.mp4', '/tmp/captions.srt', {
      startSeconds: 10, endSeconds: 40, title: 'x', hook: 'x', reason: 'x', score: 80,
    });
    const joined = args.join(' ');
    expect(joined).toContain('crop=1080:1920');
    expect(joined).toContain('subtitles=');
    expect(joined).toContain('libx264');
    expect(joined).toContain('aac');
    expect(args.at(-1)).toBe('/tmp/out.mp4');
  });
});

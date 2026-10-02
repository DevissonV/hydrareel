import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { CaptionStyle, RenderingPort, RenderOptions } from '../application/rendering.port';
import { Transcript, TranscriptWord } from '../../transcription/domain/transcript';
import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('close', (code) => code === 0
      ? resolve()
      : reject(new Error(`${command} exited ${code}: ${stderr.slice(-3500)}`)));
  });
}

function assTime(seconds: number): string {
  const cs = Math.max(0, Math.round(seconds * 100));
  const hh = Math.floor(cs / 360000);
  const mm = Math.floor((cs % 360000) / 6000);
  const ss = Math.floor((cs % 6000) / 100);
  const cc = cs % 100;
  return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
}

function escapeAss(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, ' ');
}

function wrapWords(words: string[]): string {
  if (words.length <= 3) return words.map(escapeAss).join(' ');
  const raw = words.join(' ');
  if (raw.length <= 26) return escapeAss(raw);
  const middle = Math.ceil(words.length / 2);
  return `${words.slice(0, middle).map(escapeAss).join(' ')}\\N${words.slice(middle).map(escapeAss).join(' ')}`;
}

export interface CaptionCue {
  start: number;
  end: number;
  words: TranscriptWord[];
  text: string;
}

export function buildCaptionCues(words: TranscriptWord[], clip: ClipCandidate): CaptionCue[] {
  const inside = words.filter((w) => w.end > clip.startSeconds && w.start < clip.endSeconds);
  const cues: CaptionCue[] = [];
  let current: TranscriptWord[] = [];

  const flush = () => {
    if (!current.length) return;
    const start = Math.max(0, current[0].start - clip.startSeconds);
    const end = Math.min(clip.endSeconds - clip.startSeconds, current.at(-1)!.end - clip.startSeconds);
    cues.push({
      start,
      end,
      words: current,
      text: wrapWords(current.map((w) => w.word)),
    });
    current = [];
  };

  for (const word of inside) {
    const previous = current.at(-1);
    const gap = previous ? word.start - previous.end : 0;
    const projected = [...current, word];
    const text = projected.map((w) => w.word).join(' ');
    const duration = projected.at(-1)!.end - projected[0].start;
    const shouldBreak =
      current.length >= 5 ||
      text.length > 34 ||
      duration > 2.25 ||
      (gap > 0.35 && current.length >= 2);

    if (shouldBreak) flush();
    current.push(word);
  }
  flush();
  return cues.filter((cue) => cue.end > cue.start);
}

function escapeSubtitlePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function captionPalette(style: CaptionStyle) {
  if (style === 'clean') return { fontSize: 58, active: '&H00FFFFFF', base: '&H00FFFFFF', outline: 4, shadow: 0.8 };
  if (style === 'neon') return { fontSize: 64, active: '&H00FFD85A', base: '&H00FFFFFF', outline: 5, shadow: 1.6 };
  return { fontSize: 62, active: '&H00FF77FF', base: '&H00FFFFFF', outline: 5, shadow: 1.1 };
}

function activePhrase(cue: CaptionCue, activeIndex: number, style: CaptionStyle): string {
  const palette = captionPalette(style);
  const tokens = cue.words.map((word, index) => {
    const safe = escapeAss(word.word);
    return index === activeIndex
      ? `{\\c${palette.active}\\b1\\fscx108\\fscy108}${safe}{\\c${palette.base}\\b1\\fscx100\\fscy100}`
      : safe;
  });
  if (tokens.length <= 3 || tokens.join(' ').replace(/\{[^}]+\}/g, '').length <= 26) return tokens.join(' ');
  const middle = Math.ceil(tokens.length / 2);
  return `${tokens.slice(0, middle).join(' ')}\\N${tokens.slice(middle).join(' ')}`;
}

function hookText(hook: string): string {
  const words = hook.trim().split(/\s+/).filter(Boolean).slice(0, 14);
  if (words.length <= 6) return words.map(escapeAss).join(' ');
  const middle = Math.ceil(words.length / 2);
  return `${words.slice(0, middle).map(escapeAss).join(' ')}\\N${words.slice(middle).map(escapeAss).join(' ')}`;
}

export function buildRenderArgs(
  source: string,
  destination: string,
  subtitlesPath: string,
  clip: ClipCandidate,
  options: RenderOptions = { sourceWidth: 1080, sourceHeight: 1920 },
): string[] {
  const duration = clip.endSeconds - clip.startSeconds;
  const seekLeadSeconds = Math.min(3, clip.startSeconds);
  const coarseStart = Math.max(0, clip.startSeconds - seekLeadSeconds);
  const fineSeek = clip.startSeconds - coarseStart;
  const subtitleFilter = `subtitles='${escapeSubtitlePath(subtitlesPath)}'`;
  const aspect = options.sourceHeight > 0 ? options.sourceWidth / options.sourceHeight : 9 / 16;
  const subjectSafe = aspect > 0.82;

  const visualFilter = subjectSafe
    ? `[0:v]trim=start=${fineSeek.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=32[bg2];[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg2];[bg2][fg2]overlay=(W-w)/2:(H-h)/2,${subtitleFilter}[v]`
    : `[0:v]trim=start=${fineSeek.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${subtitleFilter}[v]`;

  const audioFilter = `[0:a]atrim=start=${fineSeek.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[a]`;

  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', coarseStart.toFixed(3),
    '-i', source,
    '-filter_complex', `${visualFilter};${audioFilter}`,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    destination,
  ];
}

@Injectable()
export class FfmpegRenderingAdapter implements RenderingPort {
  async writeSubtitles(
    path: string,
    transcript: Transcript,
    clip: ClipCandidate,
    options: Pick<RenderOptions, 'hook' | 'captionStyle'>,
  ): Promise<number> {
    const style = options.captionStyle ?? 'pulse';
    const palette = captionPalette(style);
    const cues = buildCaptionCues(transcript.words, clip);

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: HydraCaption,DejaVu Sans,${palette.fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H30000000,-1,0,0,0,100,100,0,0,1,${palette.outline},${palette.shadow},2,82,82,330,1
Style: HydraHook,DejaVu Sans,54,&H00FFFFFF,&H00FFFFFF,&H00110B1D,&H8A0B0817,-1,0,0,0,100,100,0,0,3,3,0,8,100,100,150,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;

    const events: string[] = [];
    if (options.hook?.trim()) {
      const hookEnd = Math.min(3.2, clip.endSeconds - clip.startSeconds);
      if (hookEnd > 0.5) {
        events.push(`Dialogue: 1,0:00:00.00,${assTime(hookEnd)},HydraHook,,0,0,0,,{\\fad(120,180)}${hookText(options.hook)}`);
      }
    }

    if (cues.length) {
      for (const cue of cues) {
        for (let i = 0; i < cue.words.length; i += 1) {
          const word = cue.words[i];
          const next = cue.words[i + 1];
          const start = Math.max(cue.start, word.start - clip.startSeconds);
          const end = Math.min(
            clip.endSeconds - clip.startSeconds,
            next ? Math.max(word.end, next.start - clip.startSeconds) : cue.end,
          );
          if (end <= start) continue;
          events.push(
            `Dialogue: 0,${assTime(start)},${assTime(end)},HydraCaption,,0,0,0,,{\\fad(45,45)}${activePhrase(cue, i, style)}`,
          );
        }
      }
    } else {
      const segments = transcript.segments.filter((s) => s.end > clip.startSeconds && s.start < clip.endSeconds);
      for (const segment of segments) {
        const start = Math.max(0, segment.start - clip.startSeconds);
        const end = Math.min(clip.endSeconds - clip.startSeconds, segment.end - clip.startSeconds);
        if (end <= start) continue;
        events.push(
          `Dialogue: 0,${assTime(start)},${assTime(end)},HydraCaption,,0,0,0,,${hookText(segment.text)}`,
        );
      }
    }

    if (!events.length) throw new Error('No hay timestamps para generar subtítulos');
    await writeFile(path, header + events.join('\n') + '\n', 'utf8');
    return cues.length || events.length;
  }

  async render(
    source: string,
    destination: string,
    subtitlesPath: string,
    clip: ClipCandidate,
    options: RenderOptions,
  ): Promise<void> {
    await run('ffmpeg', buildRenderArgs(source, destination, subtitlesPath, clip, options));
  }
}

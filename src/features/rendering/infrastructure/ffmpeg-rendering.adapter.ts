import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { RenderingPort } from '../application/rendering.port';
import { Transcript, TranscriptWord } from '../../transcription/domain/transcript';
import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr.slice(-3500)}`)));
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
  return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, ' ');
}

function twoLineWrap(words: string[]): string {
  const text = words.join(' ').trim();
  if (text.length <= 24) return escapeAss(text);

  let best = { index: Math.ceil(words.length / 2), penalty: Number.POSITIVE_INFINITY };
  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(' ');
    const right = words.slice(i).join(' ');
    const longest = Math.max(left.length, right.length);
    const balance = Math.abs(left.length - right.length);
    const penalty = Math.max(0, longest - 26) * 10 + balance;
    if (penalty < best.penalty) best = { index: i, penalty };
  }
  return `${escapeAss(words.slice(0, best.index).join(' '))}\\N${escapeAss(words.slice(best.index).join(' '))}`;
}

export interface CaptionCue {
  start: number;
  end: number;
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
    cues.push({ start, end, text: twoLineWrap(current.map((w) => w.word)) });
    current = [];
  };

  for (const word of inside) {
    const previous = current.at(-1);
    const gap = previous ? word.start - previous.end : 0;
    const projectedWords = [...current, word];
    const projectedText = projectedWords.map((w) => w.word).join(' ');
    const duration = projectedWords.length ? projectedWords.at(-1)!.end - projectedWords[0].start : 0;
    const shouldBreak =
      current.length >= 8 ||
      projectedText.length > 46 ||
      duration > 2.8 ||
      (gap > 0.42 && current.length >= 3);

    if (shouldBreak) flush();
    current.push(word);
  }
  flush();
  return cues.filter((cue) => cue.end > cue.start);
}

function escapeSubtitlePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

export function buildRenderArgs(source: string, destination: string, subtitlesPath: string, clip: ClipCandidate): string[] {
  const duration = clip.endSeconds - clip.startSeconds;
  const seekLeadSeconds = Math.min(3, clip.startSeconds);
  const coarseStart = Math.max(0, clip.startSeconds - seekLeadSeconds);
  const fineSeek = clip.startSeconds - coarseStart;
  const subtitleFilter = `subtitles='${escapeSubtitlePath(subtitlesPath)}'`;
  const videoFilter = `[0:v]trim=start=${fineSeek.toFixed(3)}:duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${subtitleFilter}[v]`;
  const audioFilter = `[0:a]atrim=start=${fineSeek.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[a]`;
  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', coarseStart.toFixed(3),
    '-i', source,
    '-filter_complex', `${videoFilter};${audioFilter}`,
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
  async writeSubtitles(path: string, transcript: Transcript, clip: ClipCandidate): Promise<number> {
    let cues = buildCaptionCues(transcript.words, clip);

    if (!cues.length) {
      cues = transcript.segments
        .filter((s) => s.end > clip.startSeconds && s.start < clip.endSeconds)
        .map((segment) => ({
          start: Math.max(0, segment.start - clip.startSeconds),
          end: Math.min(clip.endSeconds - clip.startSeconds, segment.end - clip.startSeconds),
          text: twoLineWrap(segment.text.trim().split(/\s+/).filter(Boolean)),
        }))
        .filter((cue) => cue.end > cue.start);
    }

    if (!cues.length) throw new Error('No hay timestamps para generar subtítulos');

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: HydraReel,DejaVu Sans,68,&H00FFFFFF,&H00FFFFFF,&H00000000,&H50000000,-1,0,0,0,100,100,0,0,1,5,1.3,2,90,90,330,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;

    const events = cues.map((cue) =>
      `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},HydraReel,,0,0,0,,{\\fad(70,70)\\blur0.6}${cue.text}`
    );

    await writeFile(path, header + events.join('\n') + '\n', 'utf8');
    return cues.length;
  }

  async render(source: string, destination: string, subtitlesPath: string, clip: ClipCandidate): Promise<void> {
    await run('ffmpeg', buildRenderArgs(source, destination, subtitlesPath, clip));
  }
}

import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { RenderingPort } from '../application/rendering.port';
import { Transcript } from '../../transcription/domain/transcript';
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

function srtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hh = Math.floor(ms / 3_600_000);
  const mm = Math.floor((ms % 3_600_000) / 60_000);
  const ss = Math.floor((ms % 60_000) / 1000);
  const mmm = ms % 1000;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(mmm).padStart(3, '0')}`;
}

function escapeSubtitlePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

export function buildRenderArgs(source: string, destination: string, subtitlesPath: string, clip: ClipCandidate): string[] {
  const duration = clip.endSeconds - clip.startSeconds;
  const subtitleFilter = `subtitles='${escapeSubtitlePath(subtitlesPath)}':force_style='FontName=DejaVu Sans,FontSize=18,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=220'`;
  const videoFilter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${subtitleFilter}`;
  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', clip.startSeconds.toFixed(3), '-i', source,
    '-t', duration.toFixed(3),
    '-vf', videoFilter,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    destination,
  ];
}

@Injectable()
export class FfmpegRenderingAdapter implements RenderingPort {
  async writeSubtitles(path: string, transcript: Transcript, clip: ClipCandidate): Promise<number> {
    const words = transcript.words.filter((w) => w.end > clip.startSeconds && w.start < clip.endSeconds);
    const groups: typeof words[] = [];
    for (let i = 0; i < words.length; i += 7) groups.push(words.slice(i, i + 7));
    const lines = groups.filter((g) => g.length).map((group, index) => {
      const start = Math.max(0, group[0].start - clip.startSeconds);
      const end = Math.min(clip.endSeconds - clip.startSeconds, group.at(-1)!.end - clip.startSeconds);
      return `${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${group.map((w) => w.word).join(' ').trim()}\n`;
    });
    if (!lines.length) {
      const segments = transcript.segments.filter((s) => s.end > clip.startSeconds && s.start < clip.endSeconds);
      for (const [index, segment] of segments.entries()) {
        const start = Math.max(0, segment.start - clip.startSeconds);
        const end = Math.min(clip.endSeconds - clip.startSeconds, segment.end - clip.startSeconds);
        lines.push(`${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${segment.text}\n`);
      }
    }
    if (!lines.length) throw new Error('No hay timestamps para generar subtítulos');
    await writeFile(path, lines.join('\n'), 'utf8');
    return lines.length;
  }

  async render(source: string, destination: string, subtitlesPath: string, clip: ClipCandidate): Promise<void> {
    await run('ffmpeg', buildRenderArgs(source, destination, subtitlesPath, clip));
  }
}

import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { MediaPort } from '../application/media.port';
import { MediaMetadata } from '../domain/media-metadata';

function run(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}: ${stderr.slice(-3000)}`));
    });
  });
}

@Injectable()
export class FfmpegMediaAdapter implements MediaPort {
  async probe(path: string): Promise<MediaMetadata> {
    const { stdout } = await run('ffprobe', [
      '-v', 'error',
      '-show_streams',
      '-show_format',
      '-of', 'json',
      path,
    ]);
    const data = JSON.parse(stdout) as any;
    const video = data.streams?.find((s: any) => s.codec_type === 'video');
    const audio = data.streams?.find((s: any) => s.codec_type === 'audio');
    if (!video) throw new Error('El archivo no contiene video');
    const duration = Number(data.format?.duration ?? video.duration ?? 0);
    return {
      durationSeconds: duration,
      width: Number(video.width ?? 0),
      height: Number(video.height ?? 0),
      videoCodec: String(video.codec_name ?? ''),
      audioCodec: String(audio?.codec_name ?? ''),
      hasAudio: Boolean(audio),
      formatName: String(data.format?.format_name ?? ''),
    };
  }

  async extractAudio(source: string, destination: string): Promise<void> {
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', source,
      '-vn',
      '-af', 'aresample=async=1:first_pts=0,asetpts=PTS-STARTPTS',
      '-ac', '1', '-ar', '16000',
      '-c:a', 'libmp3lame', '-b:a', '64k',
      destination,
    ]);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await Promise.all([run('ffmpeg', ['-version']), run('ffprobe', ['-version'])]);
      return true;
    } catch {
      return false;
    }
  }
}

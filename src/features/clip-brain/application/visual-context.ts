import { spawn } from 'node:child_process';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Transcript } from '../../transcription/domain/transcript';

function capture(source: string, at: number, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-ss', String(at), '-i', source, '-frames:v', '1',
      '-vf', 'scale=320:-2', '-q:v', '7', output,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let error = '';
    child.stderr.on('data', (part) => { error += String(part).slice(-500); });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(error || 'frame failed')));
  });
}

/**
 * Optional, bounded visual sampling for videos dominated by action rather than speech.
 * Returns a small textual supplement, never invented timestamps or clip candidates.
 */
export async function inspectVisualContext(
  source: string,
  transcript: Transcript,
  config: { openaiApiKey: string; openaiBaseUrl: string; openaiClipModel: string },
): Promise<string | undefined> {
  const duration = transcript.duration;
  const spokenWords = transcript.words.length || transcript.text.trim().split(/\s+/).filter(Boolean).length;
  // Speech-rich interviews are already handled by the transcript; spend vision
  // budget only on visual-first footage longer than 30 seconds.
  if (duration < 30 || spokenWords / (duration / 60) >= 65 || !config.openaiApiKey) return undefined;
  const dir = await mkdtemp(path.join(os.tmpdir(), 'hydra-visual-'));
  try {
    const timestamps = [0.2, 0.5, 0.8].map(x => Number((duration * x).toFixed(2)));
    const frames: string[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const file = path.join(dir, `frame-${i}.jpg`);
      await capture(source, timestamps[i], file);
      frames.push((await readFile(file)).toString('base64'));
    }
    const response = await fetch(`${config.openaiBaseUrl}/responses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.openaiClipModel,
        reasoning: { effort: 'low' },
        max_output_tokens: 170,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: `Describe solo acciones, cambios visuales, protagonistas y reacciones visibles en estas tres imágenes del mismo video, tomadas a los segundos ${timestamps.join(', ')}. No infieras eventos entre imágenes, no inventes diálogo, no inventes timestamps. Máximo 90 palabras.` },
            ...frames.map(frame => ({ type: 'input_image', image_url: `data:image/jpeg;base64,${frame}`, detail: 'low' })),
          ],
        }],
      }),
    });
    if (!response.ok) return undefined;
    const json = await response.json() as any;
    const output = json.output_text ?? json.output?.flatMap((x: any) => x.content ?? [])
      .filter((x: any) => x.type === 'output_text').map((x: any) => x.text).join(' ');
    return typeof output === 'string' && output.trim() ? output.trim().slice(0, 800) : undefined;
  } catch {
    // Visual enhancement never blocks the reliable transcript-only pipeline.
    return undefined;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

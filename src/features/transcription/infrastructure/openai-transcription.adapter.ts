import { Inject, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { CONFIG, HydraConfig } from '../../../config';
import { TranscriptionPort } from '../application/transcription.port';
import { Transcript } from '../domain/transcript';

@Injectable()
export class OpenAiTranscriptionAdapter implements TranscriptionPort {
  constructor(@Inject(CONFIG) private readonly config: HydraConfig) {}

  async transcribe(audioPath: string): Promise<Transcript> {
    if (!this.config.openaiApiKey) throw new Error('OPENAI_API_KEY no está configurada');
    const bytes = await readFile(audioPath);
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', this.config.openaiTranscriptionModel);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    form.append('timestamp_granularities[]', 'segment');

    const response = await fetch(`${this.config.openaiBaseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.openaiApiKey}` },
      body: form,
      signal: AbortSignal.timeout(5 * 60 * 1000),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`OpenAI transcription HTTP ${response.status}: ${body.slice(0, 1000)}`);
    const data = JSON.parse(body) as any;
    const words = Array.isArray(data.words) ? data.words.map((w: any) => ({
      word: String(w.word ?? '').trim(), start: Number(w.start), end: Number(w.end),
    })).filter((w: any) => w.word && Number.isFinite(w.start) && Number.isFinite(w.end)) : [];
    const segments = Array.isArray(data.segments) ? data.segments.map((s: any) => ({
      id: Number.isFinite(s.id) ? Number(s.id) : undefined,
      text: String(s.text ?? '').trim(), start: Number(s.start), end: Number(s.end),
    })).filter((s: any) => s.text && Number.isFinite(s.start) && Number.isFinite(s.end)) : [];
    if (!segments.length && !words.length) throw new Error('La transcripción no devolvió timestamps utilizables');
    return {
      text: String(data.text ?? ''),
      duration: Number(data.duration ?? segments.at(-1)?.end ?? words.at(-1)?.end ?? 0),
      words,
      segments,
      model: this.config.openaiTranscriptionModel,
      usage: data.usage,
    };
  }
}

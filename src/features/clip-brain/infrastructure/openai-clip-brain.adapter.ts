import { Inject, Injectable } from '@nestjs/common';
import { CONFIG, HydraConfig } from '../../../config';
import { ClipBrainPort, ClipBrainResult } from '../application/clip-brain.port';
import { maxClipsForDuration, validateAndNormalizeCandidates } from '../domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';

function outputText(data: any): string {
  if (typeof data.output_text === 'string') return data.output_text;
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  throw new Error('OpenAI response no contiene output_text');
}

@Injectable()
export class OpenAiClipBrainAdapter implements ClipBrainPort {
  constructor(@Inject(CONFIG) private readonly config: HydraConfig) {}

  async select(transcript: Transcript): Promise<ClipBrainResult> {
    if (!this.config.openaiApiKey) throw new Error('OPENAI_API_KEY no está configurada');

    const maxClips = maxClipsForDuration(
      transcript.duration,
      this.config.minClipSeconds,
      this.config.maxClipsPerJob,
    );
    if (maxClips === 0) {
      throw new Error(`El video debe durar al menos ${this.config.minClipSeconds} segundos para generar un clip`);
    }

    const timeline = transcript.segments.map((s) => ({ start: s.start, end: s.end, text: s.text }));
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['clips'],
      properties: {
        clips: {
          type: 'array', minItems: 1, maxItems: maxClips,
          items: {
            type: 'object', additionalProperties: false,
            required: ['startSeconds', 'endSeconds', 'title', 'hook', 'reason', 'score'],
            properties: {
              startSeconds: { type: 'number', minimum: 0 },
              endSeconds: { type: 'number', minimum: 0 },
              title: { type: 'string' },
              hook: { type: 'string' },
              reason: { type: 'string' },
              score: { type: 'number', minimum: 0, maximum: 100 },
            },
          },
        },
      },
    };

    const response = await fetch(`${this.config.openaiBaseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.openaiClipModel,
        reasoning: { effort: 'low' },
        input: [
          {
            role: 'system',
            content: `Eres Clip Brain V0 de HydraReel. Selecciona entre 1 y ${maxClips} momentos fuertes de una transcripción. No rellenes una cuota: si solo existe 1 momento realmente bueno, devuelve 1; si hay 2, devuelve 2. Cada clip debe durar entre ${this.config.minClipSeconds} y ${this.config.maxClipSeconds} segundos. Usa únicamente timestamps reales presentes en la línea de tiempo. No cortes una frase por la mitad; cada clip debe entenderse sin contexto previo. Favorece hooks claros, historias, opiniones fuertes, humor, sorpresa, enseñanza o payoff. Evita saludos, intros, patrocinadores, silencios y solapamientos. El score es una heurística editorial 0-100, nunca una probabilidad de viralidad.`,
          },
          {
            role: 'user',
            content: JSON.stringify({ duration: transcript.duration, maxClips, timeline }),
          },
        ],
        text: { format: { type: 'json_schema', name: 'hydrareel_clips', strict: true, schema } },
      }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`OpenAI clip brain HTTP ${response.status}: ${body.slice(0, 1200)}`);
    const data = JSON.parse(body);
    const raw = JSON.parse(outputText(data));
    const clips = validateAndNormalizeCandidates(
      raw,
      this.config.minClipSeconds,
      this.config.maxClipSeconds,
      transcript.duration,
      maxClips,
    );
    if (!clips.length) throw new Error('Clip Brain no produjo candidatos válidos');
    return { clips, usage: data.usage };
  }
}

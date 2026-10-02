import { Inject, Injectable } from '@nestjs/common';
import { CONFIG, HydraConfig } from '../../../config';
import { ClipBrainPort, ClipBrainResult } from '../application/clip-brain.port';
import { clipPolicyForDuration, ClipCandidate, validateAndNormalizeCandidates } from '../domain/clip-candidate';
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

function wordSafeBounds(
  transcript: Transcript,
  startSegmentIndex: number,
  endSegmentIndex: number,
): { startSeconds: number; endSeconds: number } | undefined {
  const startSegment = transcript.segments[startSegmentIndex];
  const endSegment = transcript.segments[endSegmentIndex];
  if (!startSegment || !endSegment || startSegmentIndex > endSegmentIndex) return undefined;

  const words = transcript.words.filter(
    (word) => word.end > startSegment.start - 0.05 && word.start < endSegment.end + 0.2,
  );
  if (!words.length) {
    return {
      startSeconds: Math.max(0, startSegment.start - 0.08),
      endSeconds: Math.min(transcript.duration, endSegment.end + 0.12),
    };
  }

  const first = words[0];
  const last = words.at(-1)!;
  const lastIndex = transcript.words.findIndex(
    (word) => word.start === last.start && word.end === last.end && word.word === last.word,
  );
  const next = lastIndex >= 0 ? transcript.words[lastIndex + 1] : undefined;
  const gapAfter = next ? Math.max(0, next.start - last.end) : 0.4;
  const tail = gapAfter >= 0.25 ? Math.min(0.32, gapAfter * 0.6) : 0.08;

  return {
    startSeconds: Math.max(0, Math.min(startSegment.start, first.start) - 0.08),
    endSeconds: Math.min(transcript.duration, Math.max(endSegment.end, last.end) + tail),
  };
}

@Injectable()
export class OpenAiClipBrainAdapter implements ClipBrainPort {
  constructor(@Inject(CONFIG) private readonly config: HydraConfig) {}

  private async structured(name: string, schema: unknown, system: string, payload: unknown) {
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
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        text: { format: { type: 'json_schema', name, strict: true, schema } },
      }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`OpenAI Clip Brain HTTP ${response.status}: ${body.slice(0, 1200)}`);
    const data = JSON.parse(body);
    return { parsed: JSON.parse(outputText(data)), usage: data.usage };
  }

  async select(transcript: Transcript): Promise<ClipBrainResult> {
    if (!this.config.openaiApiKey) throw new Error('OPENAI_API_KEY no está configurada');

    const policy = clipPolicyForDuration(
      transcript.duration,
      this.config.minClipSeconds,
      this.config.maxClipSeconds,
      this.config.maxClipsPerJob,
    );
    if (policy.maxClips === 0) throw new Error('El video es demasiado corto para generar un clip útil');

    const timeline = transcript.segments.map((s, index) => ({ index, start: s.start, end: s.end, text: s.text }));
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['clips'],
      properties: {
        clips: {
          type: 'array', minItems: 1, maxItems: policy.maxClips,
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

    const { parsed, usage } = await this.structured(
      'hydrareel_clips',
      schema,
      `Eres el editor principal de HydraReel. Selecciona entre 1 y ${policy.maxClips} momentos realmente valiosos; nunca rellenes una cuota. Cada clip debe durar entre ${policy.minSeconds} y ${policy.maxSeconds} segundos. Debe entenderse sin contexto previo, comenzar en una idea natural y terminar después de que la idea, historia o payoff haya cerrado. Usa únicamente timestamps reales de la línea de tiempo. Prioriza hooks claros, historias, opiniones fuertes, humor, sorpresa, enseñanza o payoff. Evita intros vacías, silencios y solapamientos. Mantén title <=80 caracteres, hook <=140 y reason <=220. El score 0-100 es una heurística editorial, no una probabilidad de viralidad.`,
      { duration: transcript.duration, policy, timeline },
    );

    const clips = validateAndNormalizeCandidates(
      parsed,
      policy.minSeconds,
      policy.maxSeconds,
      transcript.duration,
      policy.maxClips,
    );
    if (!clips.length) throw new Error('Clip Brain no produjo candidatos válidos');
    return { clips, usage };
  }

  async review(transcript: Transcript, clips: ClipCandidate[]): Promise<ClipBrainResult> {
    if (!clips.length) return { clips: [] };

    const policy = clipPolicyForDuration(
      transcript.duration,
      this.config.minClipSeconds,
      this.config.maxClipSeconds,
      this.config.maxClipsPerJob,
    );
    const timeline = transcript.segments.map((s, index) => ({ index, start: s.start, end: s.end, text: s.text }));

    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['clips'],
      properties: {
        clips: {
          type: 'array',
          minItems: clips.length,
          maxItems: clips.length,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['candidateIndex', 'approved', 'startSegmentIndex', 'endSegmentIndex', 'title', 'reason', 'score'],
            properties: {
              candidateIndex: { type: 'integer', minimum: 0 },
              approved: { type: 'boolean' },
              startSegmentIndex: { type: 'integer', minimum: 0 },
              endSegmentIndex: { type: 'integer', minimum: 0 },
              title: { type: 'string' },
              reason: { type: 'string' },
              score: { type: 'number', minimum: 0, maximum: 100 },
            },
          },
        },
      },
    };

    const { parsed, usage } = await this.structured(
      'hydrareel_editorial_qa',
      schema,
      `Eres el control editorial final de HydraReel. Antes de renderizar, revisa cada candidato como si fueras un editor humano exigente. Un clip solo se aprueba si: (1) se entiende solo, (2) no empieza a mitad de una idea dependiente de contexto anterior, (3) no termina a mitad de una frase, pensamiento o payoff, y (4) tiene un cierre natural. Puedes mover el inicio y el final únicamente usando índices de segmentos reales de la transcripción. Ajusta a los límites naturales más cercanos aunque el clip quede más corto o largo, siempre dentro de ${policy.minSeconds}-${policy.maxSeconds}s. Si no puede quedar coherente, approved=false. Mantén title <=80 caracteres y reason <=220. Devuelve una entrada por cada candidato.`,
      { duration: transcript.duration, policy, candidates: clips, timeline },
    );

    const reviewed: ClipCandidate[] = [];
    for (const item of parsed.clips ?? []) {
      const original = clips[item.candidateIndex];
      const bounds = wordSafeBounds(transcript, item.startSegmentIndex, item.endSegmentIndex);
      if (!original || !item.approved || !bounds) continue;
      reviewed.push({
        startSeconds: bounds.startSeconds,
        endSeconds: bounds.endSeconds,
        title: String(item.title || original.title),
        hook: original.hook,
        reason: String(item.reason || original.reason),
        score: Number(item.score ?? original.score),
      });
    }

    const normalized = validateAndNormalizeCandidates(
      { clips: reviewed },
      policy.minSeconds,
      policy.maxSeconds,
      transcript.duration,
      policy.maxClips,
    );
    if (!normalized.length) throw new Error('La revisión editorial no encontró un corte completo y coherente');
    return { clips: normalized, usage };
  }
}

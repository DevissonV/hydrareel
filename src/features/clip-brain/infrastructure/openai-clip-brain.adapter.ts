import { Inject, Injectable } from '@nestjs/common';
import { CONFIG, HydraConfig } from '../../../config';
import { ClipBrainPort, ClipBrainResult, ClipRegenerationMode } from '../application/clip-brain.port';
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

function deterministicShorter(
  transcript: Transcript,
  original: ClipCandidate,
  minSeconds: number,
  maxSeconds: number,
): ClipCandidate | undefined {
  const duration = original.endSeconds - original.startSeconds;
  if (duration <= minSeconds + 0.75) return undefined;

  const target = Math.max(minSeconds, Math.min(maxSeconds, duration * 0.68));
  const words = transcript.words.filter(
    (word) => word.end > original.startSeconds && word.start < original.endSeconds,
  );
  const eligible = words.filter((word) => {
    const d = word.end - original.startSeconds;
    return d >= minSeconds && d <= maxSeconds && word.end < original.endSeconds - 0.2;
  });
  if (!eligible.length) return undefined;

  const natural = eligible.filter((word) => /[.!?…]$/.test(word.word.trim()));
  const pool = natural.length ? natural : eligible;
  const endWord = pool.reduce((best, word) =>
    Math.abs((word.end - original.startSeconds) - target) <
    Math.abs((best.end - original.startSeconds) - target)
      ? word
      : best,
  );

  return {
    ...original,
    endSeconds: Math.min(original.endSeconds - 0.2, endWord.end + 0.08),
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
            required: ['startSeconds', 'endSeconds', 'title', 'hook', 'reason', 'socialCaption', 'hashtags', 'emphasisTerms', 'score'],
            properties: {
              startSeconds: { type: 'number', minimum: 0 },
              endSeconds: { type: 'number', minimum: 0 },
              title: { type: 'string', maxLength: 80 },
              hook: { type: 'string', maxLength: 140 },
              reason: { type: 'string', maxLength: 220 },
              socialCaption: { type: 'string', maxLength: 500 },
              hashtags: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', maxLength: 40 } },
              emphasisTerms: { type: 'array', minItems: 0, maxItems: 6, items: { type: 'string', maxLength: 40 } },
              score: { type: 'number', minimum: 0, maximum: 100 },
            },
          },
        },
      },
    };

    const { parsed, usage } = await this.structured(
      'hydrareel_clips',
      schema,
      `Eres el editor principal de HydraReel. Selecciona entre 1 y ${policy.maxClips} momentos realmente valiosos; nunca rellenes una cuota. Cada clip debe durar entre ${policy.minSeconds} y ${policy.maxSeconds} segundos. Debe entenderse sin contexto previo, comenzar en una idea natural y terminar después de que la idea, historia o payoff haya cerrado. Usa únicamente timestamps reales de la línea de tiempo. Prioriza hooks claros, historias, opiniones fuertes, humor, sorpresa, enseñanza o payoff. Evita intros vacías, silencios y solapamientos. Además del corte, empaqueta cada clip para publicación: title <=80 caracteres, hook <=140 caracteres que pueda mostrarse visualmente al inicio sin inventar hechos, socialCaption <=500 caracteres útil como copy para Reels/Shorts/TikTok y entre 1 y 5 hashtags específicos. Mantén reason <=220. No uses clickbait falso. Devuelve emphasisTerms con 0-6 palabras o frases cortas que realmente carguen significado: conceptos centrales, cifras, nombres, contraste o payoff. No resaltes conectores, muletillas ni palabras comunes solo por animar. Si nada merece énfasis, devuelve []. El score 0-100 es una heurística editorial, no una probabilidad de viralidad.`,
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

    let parsed: any;
    let usage: unknown;
    try {
      const result = await this.structured(
        'hydrareel_editorial_qa',
        schema,
        `Eres el control editorial final de HydraReel. Antes de renderizar, revisa cada candidato como si fueras un editor humano exigente. Un clip se aprueba cuando se entiende solo, empieza de forma natural, termina después de cerrar la frase/idea/payoff y puede mejorarse usando únicamente límites reales de segmentos. Puedes mover inicio y final dentro de ${policy.minSeconds}-${policy.maxSeconds}s. Si no puedes MEJORAR con seguridad un candidato, approved=false: Hydra conservará el corte original válido en vez de perderlo. Mantén title <=80 caracteres y reason <=220. Devuelve una entrada por cada candidato.`,
        { duration: transcript.duration, policy, candidates: clips, timeline },
      );
      parsed = result.parsed;
      usage = result.usage;
    } catch {
      return {
        clips,
        usage: { fallback: 'all_original_candidates', reason: 'editorial_qa_unavailable' },
      };
    }

    const reviewedByIndex = new Map<number, ClipCandidate>();
    for (const item of parsed.clips ?? []) {
      const original = clips[item.candidateIndex];
      if (!original || !item.approved) continue;
      const bounds = wordSafeBounds(transcript, item.startSegmentIndex, item.endSegmentIndex);
      if (!bounds) continue;

      const revised = validateAndNormalizeCandidates(
        { clips: [{
          startSeconds: bounds.startSeconds,
          endSeconds: bounds.endSeconds,
          title: String(item.title || original.title),
          hook: original.hook,
          reason: String(item.reason || original.reason),
          socialCaption: original.socialCaption,
          hashtags: original.hashtags,
          emphasisTerms: original.emphasisTerms,
          score: Number(item.score ?? original.score),
        }] },
        policy.minSeconds,
        policy.maxSeconds,
        transcript.duration,
        1,
      );

      if (revised[0]) reviewedByIndex.set(item.candidateIndex, revised[0]);
    }

    const merged = clips.map((original, index) => reviewedByIndex.get(index) ?? original);
    const normalized = validateAndNormalizeCandidates(
      { clips: merged },
      policy.minSeconds,
      policy.maxSeconds,
      transcript.duration,
      policy.maxClips,
    );

    return {
      clips: normalized.length ? normalized : clips,
      usage: {
        editorialReview: usage,
        improved: reviewedByIndex.size,
        preservedOriginals: Math.max(0, clips.length - reviewedByIndex.size),
      },
    };
  }

  async regenerate(
    transcript: Transcript,
    original: ClipCandidate,
    mode: ClipRegenerationMode,
  ): Promise<{ clip: ClipCandidate; usage?: unknown }> {
    const policy = clipPolicyForDuration(
      transcript.duration,
      this.config.minClipSeconds,
      this.config.maxClipSeconds,
      this.config.maxClipsPerJob,
    );
    const timeline = transcript.segments.map((s, index) => ({ index, start: s.start, end: s.end, text: s.text }));
    const originalDuration = original.endSeconds - original.startSeconds;

    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['startSegmentIndex', 'endSegmentIndex', 'title', 'hook', 'reason', 'socialCaption', 'hashtags', 'emphasisTerms', 'score'],
      properties: {
        startSegmentIndex: { type: 'integer', minimum: 0 },
        endSegmentIndex: { type: 'integer', minimum: 0 },
        title: { type: 'string', maxLength: 80 },
        hook: { type: 'string', maxLength: 140 },
        reason: { type: 'string', maxLength: 220 },
        socialCaption: { type: 'string', maxLength: 500 },
        hashtags: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', maxLength: 40 } },
        emphasisTerms: { type: 'array', minItems: 0, maxItems: 6, items: { type: 'string', maxLength: 40 } },
        score: { type: 'number', minimum: 0, maximum: 100 },
      },
    };

    const instruction =
      mode === 'shorter'
        ? `Crea una versión más compacta del mismo momento, idealmente 25-35% más corta que ${originalDuration.toFixed(1)}s, sin cortar la idea ni el payoff.`
        : mode === 'longer'
          ? `Crea una versión con más contexto del mismo momento, idealmente 20-35% más larga que ${originalDuration.toFixed(1)}s, sin superar ${policy.maxSeconds}s ni añadir relleno irrelevante.`
          : 'Busca un momento alternativo fuerte del video, diferente al original, que pueda funcionar mejor como short y que se entienda por sí solo.';

    const { parsed, usage } = await this.structured(
      'hydrareel_regenerated_clip',
      schema,
      `Eres un editor senior de video corto. ${instruction} Usa exclusivamente índices de segmentos reales. El inicio debe sentirse natural y el final debe cerrar completamente la frase o idea. Devuelve además packaging listo para publicar: título, hook visual fiel al contenido, socialCaption y 1-5 hashtags específicos. Devuelve también emphasisTerms con 0-6 términos realmente importantes para resaltar en subtítulos; no elijas palabras por ritmo ni posición. No inventes hechos ni uses clickbait falso.`,
      { mode, duration: transcript.duration, original, policy, timeline },
    );

    const bounds = wordSafeBounds(transcript, parsed.startSegmentIndex, parsed.endSegmentIndex);
    if (!bounds) {
      if (mode === 'shorter') {
        const min = Math.max(8, Math.min(policy.minSeconds, originalDuration * 0.45));
        const max = Math.max(min, Math.min(policy.maxSeconds, originalDuration * 0.9));
        const fallback = deterministicShorter(transcript, original, min, max);
        if (fallback) return { clip: fallback, usage: { editorialRegeneration: usage, fallback: 'deterministic_shorter' } };
      }
      throw new Error('No se pudo obtener un corte coherente para la regeneración');
    }

    const candidate = {
      startSeconds: bounds.startSeconds,
      endSeconds: bounds.endSeconds,
      title: parsed.title,
      hook: parsed.hook,
      reason: parsed.reason,
      socialCaption: parsed.socialCaption,
      hashtags: parsed.hashtags,
      emphasisTerms: parsed.emphasisTerms,
      score: parsed.score,
    };

    const min =
      mode === 'shorter'
        ? Math.max(8, Math.min(policy.minSeconds, originalDuration * 0.45))
        : policy.minSeconds;
    const max =
      mode === 'shorter'
        ? Math.max(min, Math.min(policy.maxSeconds, originalDuration * 0.9))
        : policy.maxSeconds;

    const normalized = validateAndNormalizeCandidates(
      { clips: [candidate] },
      min,
      max,
      transcript.duration,
      1,
    );
    if (!normalized.length) {
      if (mode === 'shorter') {
        const fallback = deterministicShorter(transcript, original, min, max);
        if (fallback) {
          return {
            clip: fallback,
            usage: { editorialRegeneration: usage, fallback: 'deterministic_shorter' },
          };
        }
        throw new Error('Este clip ya está cerca de la duración mínima');
      }
      throw new Error('La regeneración no produjo un clip válido');
    }
    return { clip: normalized[0], usage };
  }
}

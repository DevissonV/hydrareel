import { Inject, Injectable } from '@nestjs/common';
import { CONFIG, HydraConfig } from '../../../config';
import { ClipBrainPort, ClipBrainResult, ClipRegenerationMode } from '../application/clip-brain.port';
import { clipPolicyForDuration, ClipCandidate, normalizeHashtags, validateAndNormalizeCandidates } from '../domain/clip-candidate';
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
    hashtags: normalizeHashtags(original.hashtags),
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
              hook: { type: 'string', maxLength: 80 },
              reason: { type: 'string', maxLength: 220 },
              socialCaption: { type: 'string', maxLength: 500 },
              hashtags: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'string', maxLength: 40 } },
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
      `Eres el editor principal de HydraReel y optimizas video corto para retención, comentarios y compartidos sin clickbait falso. Selecciona entre 1 y ${policy.maxClips} momentos realmente valiosos; nunca rellenes una cuota. Cada clip debe durar entre ${policy.minSeconds} y ${policy.maxSeconds} segundos. Debe entenderse sin contexto previo, comenzar en una idea natural y terminar después de que la idea, historia o payoff haya cerrado. Usa únicamente timestamps reales de la línea de tiempo.

Prioriza momentos con una de estas fuerzas: sorpresa real, contraste, humor, opinión fuerte, tensión, transformación, dato inesperado, identidad aspiracional o payoff claro. Para el score 0-100 evalúa: hook inmediato 30 puntos, potencial de retención 25, payoff 20, potencial de comentario/compartido 15 y claridad sin contexto 10. No es una probabilidad de viralidad.

Packaging social-native:
- title <=80 caracteres. Debe sonar a creador, no a titular de prensa.
- hook idealmente 4-10 palabras y <=80 caracteres. Debe poder entenderse en los primeros 1-3 segundos, abrir curiosidad o tensión y ser fiel al clip.
- socialCaption <=500 caracteres, pero normalmente 1-2 frases cortas. Debe AGREGAR algo al hook, no repetirlo ni parafrasearlo.
- Evita voz periodística o distante salvo que el contenido sea realmente noticia/reportaje. No uses fórmulas como "cuenta que", "asegura que", "señala que", "explica que" o "a sus X años..." como redacción externa por defecto.
- Si el protagonista habla de sí mismo, prefiere primera persona o una voz conversacional coherente con el creador. Si publica otra cuenta, usa observación directa y casual, no narrador de noticiero.
- Si existe una pregunta natural que invite a opinar, termina el socialCaption con una pregunta corta y específica. No fuerces CTA genéricas como "¿qué opinas?" cuando no aportan.
- Si es humor, añade un remate breve, relacionado con lo que realmente ocurre, con máximo 1-2 emojis. No inventes palabras, deformes ortografía, repitas sílabas ni fuerces chistes.
- No repitas la misma premisa en title + hook + socialCaption: cada elemento debe cumplir una función distinta.
- Devuelve exactamente 5 hashtags: #viral y #fyp son obligatorios, más 3 específicos y relevantes; si es humor, uno debe ser #humor. No inventes hashtags de tendencia que no puedas justificar por el contenido.
- Mantén reason <=220 y explica por qué el momento puede retener o provocar reacción.
- Devuelve emphasisTerms con 0-6 palabras o frases cortas que carguen significado: conceptos centrales, cifras, nombres, contraste o payoff. No resaltes conectores, muletillas ni palabras comunes solo por animar. Si nada merece énfasis, devuelve [].

La meta no es sonar "viral" de forma artificial: debe sentirse como un post nativo de TikTok/Reels, escrito por una persona que entiende el clip.`,
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

  async selectMore(
    transcript: Transcript,
    existing: ClipCandidate[],
    limit = 2,
  ): Promise<ClipBrainResult> {
    if (!this.config.openaiApiKey) throw new Error('OPENAI_API_KEY no está configurada');

    const policy = clipPolicyForDuration(
      transcript.duration,
      this.config.minClipSeconds,
      this.config.maxClipSeconds,
      this.config.maxClipsPerJob,
    );
    const requested = Math.max(1, Math.min(4, limit));
    const usedRanges = existing.map((clip) => ({
      start: Number(clip.startSeconds.toFixed(2)),
      end: Number(clip.endSeconds.toFixed(2)),
      title: clip.title,
    }));
    const overlapsUsedRange = (start: number, end: number) =>
      usedRanges.some((range) => Math.max(start, range.start) < Math.min(end, range.end));
    const timeline = transcript.segments
      .map((s, index) => ({ index, start: s.start, end: s.end, text: s.text }))
      .filter((segment) => !overlapsUsedRange(segment.start, segment.end));
    const schema = {
      type: 'object',
      additionalProperties: false,
      required: ['clips'],
      properties: {
        clips: {
          type: 'array',
          minItems: 0,
          maxItems: requested,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['startSeconds', 'endSeconds', 'title', 'hook', 'reason', 'socialCaption', 'hashtags', 'emphasisTerms', 'score'],
            properties: {
              startSeconds: { type: 'number', minimum: 0 },
              endSeconds: { type: 'number', minimum: 0 },
              title: { type: 'string', maxLength: 80 },
              hook: { type: 'string', maxLength: 80 },
              reason: { type: 'string', maxLength: 220 },
              socialCaption: { type: 'string', maxLength: 500 },
              hashtags: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'string', maxLength: 40 } },
              emphasisTerms: { type: 'array', minItems: 0, maxItems: 6, items: { type: 'string', maxLength: 40 } },
              score: { type: 'number', minimum: 0, maximum: 100 },
            },
          },
        },
      },
    };

    const { parsed, usage } = await this.structured(
      'hydrareel_more_clips',
      schema,
      `Eres un editor senior buscando oportunidades que una primera pasada pudo dejar fuera. Encuentra hasta ${requested} clips ADICIONALES que sean realmente publicables y diferentes de los ya usados. No rellenes cuota: si no hay más momentos fuertes devuelve clips:[]. Cada nuevo clip debe durar entre ${policy.minSeconds} y ${policy.maxSeconds} segundos, entenderse sin contexto y cerrar su idea/payoff.

Regla crítica de no repetición: no reutilices el mismo momento, argumento o payoff de los rangos ya usados. La línea de tiempo recibida ya excluye segmentos cubiertos por clips existentes; trabaja únicamente con esos segmentos restantes. Prefiere otra historia, respuesta, broma, dato, tensión, reacción, opinión o transformación.

Mantén packaging social-native: title <=80; hook corto para 1-3 segundos; socialCaption breve que agregue algo; exactamente 5 hashtags con #viral y #fyp más 3 relevantes; sin tono periodístico salvo que corresponda; sin clickbait falso. El score evalúa hook, retención, payoff, conversación y claridad.`,
      { duration: transcript.duration, policy, usedRanges, timeline },
    );

    const candidates = validateAndNormalizeCandidates(
      parsed,
      policy.minSeconds,
      policy.maxSeconds,
      transcript.duration,
      requested,
    );

    const overlapRatio = (a: ClipCandidate, b: ClipCandidate) => {
      const overlap = Math.max(0, Math.min(a.endSeconds, b.endSeconds) - Math.max(a.startSeconds, b.startSeconds));
      const shorter = Math.max(0.001, Math.min(a.endSeconds - a.startSeconds, b.endSeconds - b.startSeconds));
      return overlap / shorter;
    };

    const unique = candidates.filter((candidate) =>
      existing.every((current) => overlapRatio(candidate, current) < 0.25),
    );
    return { clips: unique, usage };
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
        `Eres el control editorial final de HydraReel. Evalúa si cada candidato realmente merece publicarse: claridad sin contexto, gancho fiel en los primeros segundos, cierre completo, ausencia de relleno y valor genuino para una audiencia. approved=false significa que NO es publicable, no simplemente que no se puede mejorar. approved=true puede mantener los límites originales cuando ya son correctos. Ajusta los límites solo si mejoran el corte sin eliminar premisas o remates. Usa índices reales de segmentos y límites entre ${policy.minSeconds}-${policy.maxSeconds}s. No apruebes por cumplir una cuota. Mantén title <=80 caracteres y reason <=220. Devuelve una entrada por cada candidato.`,
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

    const approved: ClipCandidate[] = [];
    const seen = new Set<number>();
    let rejected = 0;
    let adjusted = 0;
    let keptOriginal = 0;
    for (const item of parsed.clips ?? []) {
      const index = Number(item.candidateIndex);
      if (!Number.isInteger(index) || seen.has(index) || !clips[index]) continue;
      seen.add(index);
      if (item.approved !== true) {
        rejected += 1;
        continue;
      }
      const original = clips[index];
      const bounds = wordSafeBounds(transcript, item.startSegmentIndex, item.endSegmentIndex);
      const proposal = bounds ? validateAndNormalizeCandidates(
        { clips: [{
          ...original,
          startSeconds: bounds.startSeconds,
          endSeconds: bounds.endSeconds,
          title: String(item.title || original.title),
          reason: String(item.reason || original.reason),
          score: Number(item.score ?? original.score),
        }] },
        policy.minSeconds, policy.maxSeconds, transcript.duration, 1,
      )[0] : undefined;
      if (proposal) {
        approved.push(proposal);
        adjusted += 1;
      } else {
        // A positive editorial approval is distinct from the ability to adjust timing.
        approved.push(original);
        keptOriginal += 1;
      }
    }
    // Missing decisions are not approvals; never silently convert them to publishable clips.
    rejected += Math.max(0, clips.length - seen.size);
    const normalized = validateAndNormalizeCandidates(
      { clips: approved }, policy.minSeconds, policy.maxSeconds,
      transcript.duration, policy.maxClips,
    );
    return {
      clips: normalized,
      usage: {
        editorialReview: usage,
        approved: normalized.length,
        rejected,
        adjusted,
        keptOriginal,
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
        hook: { type: 'string', maxLength: 80 },
        reason: { type: 'string', maxLength: 220 },
        socialCaption: { type: 'string', maxLength: 500 },
        hashtags: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'string', maxLength: 40 } },
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

    let parsed: any;
    let usage: unknown;
    try {
      const result = await this.structured(
        'hydrareel_regenerated_clip',
        schema,
        `Eres un editor senior de video corto. ${instruction} Usa exclusivamente índices de segmentos reales. El inicio debe sentirse natural y el final debe cerrar completamente la frase o idea.

Devuelve packaging social-native, no periodístico: title <=80 caracteres; hook breve, fiel y diseñado para los primeros 1-3 segundos; socialCaption normalmente de 1-2 frases que complemente el hook en lugar de repetirlo. Evita por defecto "cuenta que", "asegura que", "señala que", "explica que" y narración distante. Si el protagonista habla de sí mismo, prefiere primera persona o voz conversacional coherente; si publica otra cuenta, usa observación directa y casual. Cuando encaje de forma natural, cierra con una pregunta específica que genere opinión o debate sin mendigar interacción.

Si el contenido es claramente humorístico, agrega un remate breve y divertido relacionado con el clip, sin inventar palabras, deformar ortografía, repetir sílabas ni forzar chistes. No repitas la misma premisa entre title, hook y socialCaption. Devuelve exactamente 5 hashtags: #viral y #fyp obligatorios, más 3 específicos del contenido; si es humor, incluye #humor entre esos 3. No inventes tendencias. Devuelve emphasisTerms con 0-6 términos realmente importantes para resaltar en subtítulos; no elijas palabras por ritmo ni posición. No inventes hechos ni uses clickbait falso.`,
        { mode, duration: transcript.duration, original, policy, timeline },
      );
      parsed = result.parsed;
      usage = result.usage;
    } catch (error) {
      if (mode === 'shorter') {
        const fallbackMin = Math.max(8, Math.min(policy.minSeconds, originalDuration * 0.45));
        const fallbackMax = Math.max(fallbackMin, Math.min(policy.maxSeconds, originalDuration * 0.9));
        const fallback = deterministicShorter(transcript, original, fallbackMin, fallbackMax);
        if (fallback) return { clip: fallback, usage: { fallback: 'deterministic_shorter' } };
      }
      throw error;
    }

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

import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';
import { Transcript, TranscriptWord } from '../../transcription/domain/transcript';

export type PlatformTarget = 'tiktok' | 'reels' | 'shorts';
export type CaptionPolicy = 'FULL' | 'REDUCED' | 'KEY_MOMENTS' | 'HOOK_ONLY' | 'NONE';
export type EditorialRole = 'DIALOGUE' | 'EMPHASIS' | 'PUNCHLINE' | 'REACTION';
export type VisualIdentity = 'pulse' | 'clean' | 'neon';

export interface CompositionPlan {
  version: 'adaptive-editorial-v1';
  platform: PlatformTarget;
  captionPolicy: CaptionPolicy;
  identity: VisualIdentity;
  safeZone: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  subjectCorridor: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  hook: {
    x: number;
    y: number;
    maxWidth: number;
    maxWords: number;
    maxChars: number;
    durationSeconds: number;
  };
  caption: {
    x: number;
    dialogueY: number;
    emphasisY: number;
    punchlineY: number;
    reactionY: number;
    maxWidth: number;
  };
}

const PLATFORM_LAYOUTS: Record<PlatformTarget, Omit<CompositionPlan, 'version' | 'captionPolicy' | 'identity'>> = {
  tiktok: {
    platform: 'tiktok',
    safeZone: { top: 240, right: 220, bottom: 430, left: 72 },
    subjectCorridor: { left: 250, right: 830, top: 430, bottom: 1160 },
    hook: { x: 430, y: 330, maxWidth: 700, maxWords: 10, maxChars: 68, durationSeconds: 2.2 },
    caption: { x: 430, dialogueY: 1300, emphasisY: 1235, punchlineY: 1160, reactionY: 1210, maxWidth: 700 },
  },
  reels: {
    platform: 'reels',
    safeZone: { top: 210, right: 165, bottom: 410, left: 68 },
    subjectCorridor: { left: 245, right: 835, top: 400, bottom: 1170 },
    hook: { x: 455, y: 305, maxWidth: 740, maxWords: 10, maxChars: 70, durationSeconds: 2.2 },
    caption: { x: 455, dialogueY: 1315, emphasisY: 1245, punchlineY: 1170, reactionY: 1220, maxWidth: 740 },
  },
  shorts: {
    platform: 'shorts',
    safeZone: { top: 185, right: 180, bottom: 330, left: 68 },
    subjectCorridor: { left: 245, right: 835, top: 385, bottom: 1210 },
    hook: { x: 450, y: 285, maxWidth: 730, maxWords: 10, maxChars: 70, durationSeconds: 2.25 },
    caption: { x: 450, dialogueY: 1380, emphasisY: 1305, punchlineY: 1225, reactionY: 1280, maxWidth: 730 },
  },
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function wordsInside(transcript: Transcript, clip: ClipCandidate): TranscriptWord[] {
  return transcript.words.filter(
    (word) => word.end > clip.startSeconds && word.start < clip.endSeconds,
  );
}

function speechCoverage(words: TranscriptWord[], clip: ClipCandidate): number {
  const duration = Math.max(0.1, clip.endSeconds - clip.startSeconds);
  if (!words.length) return 0;

  let occupied = 0;
  let cursor = Math.max(clip.startSeconds, words[0].start);
  let end = Math.min(clip.endSeconds, words[0].end);

  for (const word of words.slice(1)) {
    const start = Math.max(clip.startSeconds, word.start);
    const wordEnd = Math.min(clip.endSeconds, word.end);
    if (start - end <= 0.24) {
      end = Math.max(end, wordEnd);
      continue;
    }
    occupied += Math.max(0, end - cursor);
    cursor = start;
    end = wordEnd;
  }
  occupied += Math.max(0, end - cursor);
  return Math.min(1, occupied / duration);
}

export function decideCaptionPolicy(transcript: Transcript, clip: ClipCandidate): CaptionPolicy {
  const words = wordsInside(transcript, clip);
  const duration = Math.max(0.1, clip.endSeconds - clip.startSeconds);
  const wordsPerSecond = words.length / duration;
  const coverage = speechCoverage(words, clip);

  if (words.length < 4 || wordsPerSecond < 0.28) return 'HOOK_ONLY';
  if (wordsPerSecond < 0.75 || coverage < 0.22) {
    return clip.emphasisTerms.length ? 'KEY_MOMENTS' : 'HOOK_ONLY';
  }
  if (wordsPerSecond < 1.45 || coverage < 0.42) return 'REDUCED';
  return 'FULL';
}

export function selectVisualIdentity(clip: ClipCandidate): VisualIdentity {
  const tags = clip.hashtags.map((tag) => normalize(tag));
  const searchable = [
    normalize(clip.title),
    normalize(clip.hook),
    ...tags,
  ].join(' ');

  if (/(humor|meme|comedia|gracioso|risa)/.test(searchable)) return 'pulse';
  if (/(tutorial|educa|aprende|datos|finanza|negocio|tecnologia|tech|explica)/.test(searchable)) return 'clean';
  if (/(futbol|deporte|gaming|musica|reaccion|reaction|partido|gol)/.test(searchable)) return 'neon';
  return /[!?¡¿]/.test(clip.hook) ? 'pulse' : 'clean';
}

export function buildCompositionPlan(
  transcript: Transcript,
  clip: ClipCandidate,
  platform: PlatformTarget = 'tiktok',
): CompositionPlan {
  const layout = PLATFORM_LAYOUTS[platform];
  const plan: CompositionPlan = {
    version: 'adaptive-editorial-v1',
    ...layout,
    captionPolicy: decideCaptionPolicy(transcript, clip),
    identity: selectVisualIdentity(clip),
  };
  assertCompositionSafe(plan);
  return plan;
}

export function editorialRoleForCue(
  words: TranscriptWord[],
  cueStart: number,
  cueEnd: number,
  clip: ClipCandidate,
): EditorialRole {
  const text = words.map((word) => word.word).join(' ').trim();
  const tokens = new Set(words.map((word) => normalize(word.word)).filter(Boolean));
  const emphasis = clip.emphasisTerms
    .flatMap((term) => term.split(/\s+/))
    .map(normalize)
    .filter(Boolean);
  const hasEmphasis = emphasis.some((token) => tokens.has(token));
  const duration = Math.max(0.1, clip.endSeconds - clip.startSeconds);
  const relativeEnd = cueEnd / duration;

  if (hasEmphasis && (relativeEnd >= 0.58 || /[!…]$/.test(text))) return 'PUNCHLINE';
  if (words.length <= 3 && /[!?¡¿…]$/.test(text)) return 'REACTION';
  if (hasEmphasis) return 'EMPHASIS';
  return 'DIALOGUE';
}

export function shouldRenderCue(
  policy: CaptionPolicy,
  role: EditorialRole,
  index: number,
): boolean {
  if (policy === 'NONE' || policy === 'HOOK_ONLY') return false;
  if (policy === 'FULL') return true;
  if (policy === 'KEY_MOMENTS') return role !== 'DIALOGUE';
  return role !== 'DIALOGUE' || index % 2 === 0;
}

export function assertCompositionSafe(plan: CompositionPlan): void {
  const { safeZone, hook, caption } = plan;
  const rightLimit = 1080 - safeZone.right;
  const bottomLimit = 1920 - safeZone.bottom;

  const hookLeft = hook.x - hook.maxWidth / 2;
  const hookRight = hook.x + hook.maxWidth / 2;
  if (hook.y < safeZone.top || hookLeft < safeZone.left || hookRight > rightLimit) {
    throw new Error(`Hook fuera de safe zone ${plan.platform}`);
  }

  const captionLeft = caption.x - caption.maxWidth / 2;
  const captionRight = caption.x + caption.maxWidth / 2;
  const captionYs = [
    caption.dialogueY,
    caption.emphasisY,
    caption.punchlineY,
    caption.reactionY,
  ];
  if (
    captionLeft < safeZone.left ||
    captionRight > rightLimit ||
    captionYs.some((y) => y <= plan.subjectCorridor.bottom || y >= bottomLimit)
  ) {
    throw new Error(`Captions fuera de safe zone ${plan.platform}`);
  }
}

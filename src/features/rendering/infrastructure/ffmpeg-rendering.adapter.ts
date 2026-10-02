import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import {
  CaptionStyle,
  MagicEditPlan,
  RenderingPort,
  RenderOptions,
} from '../application/rendering.port';
import { Transcript, TranscriptWord } from '../../transcription/domain/transcript';
import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';
import {
  buildCompositionPlan,
  CompositionPlan,
  EditorialRole,
  editorialRoleForCue,
  PlatformTarget,
  shouldRenderCue,
} from '../domain/composition';

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('close', (code, signal) => code === 0
      ? resolve()
      : reject(new Error(`${command} failed (${signal ?? `exit ${code}`}): ${stderr.slice(-3500)}`)));
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
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, ' ');
}

function normalizeWord(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9$%]+/g, '');
}

function emphasisTokens(terms: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const term of terms) {
    for (const token of term.split(/\s+/)) {
      const normalized = normalizeWord(token);
      if (normalized.length >= 2) tokens.add(normalized);
    }
  }
  return tokens;
}

function wrapTokens(tokens: string[]): string {
  if (tokens.length <= 2) return tokens.join(' ');
  const visible = tokens.join(' ').replace(/\{[^}]+\}/g, '');
  if (visible.length <= 22) return tokens.join(' ');

  let bestBreak = 1;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let i = 1; i < tokens.length; i += 1) {
    const left = tokens.slice(0, i).join(' ').replace(/\{[^}]+\}/g, '').length;
    const right = tokens.slice(i).join(' ').replace(/\{[^}]+\}/g, '').length;
    const delta = Math.abs(left - right);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestBreak = i;
    }
  }
  return `${tokens.slice(0, bestBreak).join(' ')}\\N${tokens.slice(bestBreak).join(' ')}`;
}

function wrapWords(words: string[]): string {
  return wrapTokens(words.map(escapeAss));
}

export interface CaptionCue {
  start: number;
  end: number;
  words: TranscriptWord[];
  text: string;
}

export function buildCaptionCues(words: TranscriptWord[], clip: ClipCandidate): CaptionCue[] {
  const inside = words.filter((word) => word.end > clip.startSeconds && word.start < clip.endSeconds);
  const cues: CaptionCue[] = [];
  let current: TranscriptWord[] = [];

  const flush = () => {
    if (!current.length) return;
    cues.push({
      start: Math.max(0, current[0].start - clip.startSeconds),
      end: Math.min(clip.endSeconds - clip.startSeconds, current.at(-1)!.end - clip.startSeconds),
      words: current,
      text: wrapWords(current.map((word) => word.word)),
    });
    current = [];
  };

  for (const word of inside) {
    const previous = current.at(-1);
    const gap = previous ? word.start - previous.end : 0;
    const projected = [...current, word];
    const text = projected.map((item) => item.word).join(' ');
    const duration = projected.at(-1)!.end - projected[0].start;
    const shouldBreak =
      current.length >= 5 ||
      text.length > 36 ||
      duration > 2.35 ||
      (gap > 0.38 && current.length >= 2);

    if (shouldBreak) flush();
    current.push(word);
  }
  flush();
  return cues.filter((cue) => cue.end > cue.start);
}

function mapSourceToOutput(sourceTime: number, plan: MagicEditPlan): number {
  const first = plan.segments[0];
  if (!first) return 0;
  if (sourceTime <= first.sourceStart) return 0;

  for (const segment of plan.segments) {
    if (sourceTime >= segment.sourceStart && sourceTime <= segment.sourceEnd) {
      return segment.outputStart + (sourceTime - segment.sourceStart);
    }
    if (sourceTime < segment.sourceStart) return segment.outputStart;
  }

  return plan.outputDuration;
}

export function buildMagicEditPlan(
  transcript: Transcript,
  clip: ClipCandidate,
  platform: PlatformTarget = 'tiktok',
): MagicEditPlan {
  const inside = transcript.words.filter(
    (word) => word.end > clip.startSeconds && word.start < clip.endSeconds,
  );

  const cutRanges: Array<{ start: number; end: number }> = [];
  for (let i = 1; i < inside.length && cutRanges.length < 8; i += 1) {
    const previous = inside[i - 1];
    const current = inside[i];
    const gap = current.start - previous.end;
    if (gap < 0.9) continue;

    const cutStart = Math.max(clip.startSeconds, previous.end + 0.1);
    const cutEnd = Math.min(clip.endSeconds, current.start - 0.12);
    if (cutEnd - cutStart >= 0.42) cutRanges.push({ start: cutStart, end: cutEnd });
  }

  const rawSegments: Array<{ sourceStart: number; sourceEnd: number }> = [];
  let cursor = clip.startSeconds;
  for (const cut of cutRanges) {
    if (cut.start > cursor + 0.04) rawSegments.push({ sourceStart: cursor, sourceEnd: cut.start });
    cursor = Math.max(cursor, cut.end);
  }
  if (clip.endSeconds > cursor + 0.04) {
    rawSegments.push({ sourceStart: cursor, sourceEnd: clip.endSeconds });
  }
  if (!rawSegments.length) {
    rawSegments.push({ sourceStart: clip.startSeconds, sourceEnd: clip.endSeconds });
  }

  let outputCursor = 0;
  const segments = rawSegments.map((segment) => {
    const duration = Math.max(0, segment.sourceEnd - segment.sourceStart);
    const result = {
      ...segment,
      outputStart: outputCursor,
      outputEnd: outputCursor + duration,
    };
    outputCursor += duration;
    return result;
  });

  const removedSeconds = Math.max(
    0,
    (clip.endSeconds - clip.startSeconds) - outputCursor,
  );

  const terms = clip.emphasisTerms ?? [];
  const punchIns: Array<{ start: number; end: number }> = [];

  return {
    segments,
    silenceCuts: cutRanges.length,
    removedSeconds: Number(removedSeconds.toFixed(3)),
    punchIns,
    emphasisTerms: terms,
    outputDuration: Number(outputCursor.toFixed(3)),
    audioPolished: true,
    colorPolished: true,
    composition: buildCompositionPlan(transcript, clip, platform),
  };
}

function escapeSubtitlePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function captionPalette(style: CaptionStyle) {
  if (style === 'clean') {
    return { fontSize: 58, accent: '&H00FFFFFF', outline: 4, shadow: 0.8 };
  }
  if (style === 'neon') {
    return { fontSize: 62, accent: '&H00FFD85A', outline: 5, shadow: 1.4 };
  }
  return { fontSize: 60, accent: '&H00FF77FF', outline: 5, shadow: 1.0 };
}

function semanticPhrase(cue: CaptionCue, terms: string[], style: CaptionStyle): string {
  const palette = captionPalette(style);
  const tokens = emphasisTokens(terms);

  return wrapTokens(cue.words.map((word) => {
    const safe = escapeAss(word.word);
    if (!tokens.has(normalizeWord(word.word))) return safe;
    return `{\\c${palette.accent}\\b1}${safe}{\\c&H00FFFFFF\\b1}`;
  }));
}

function hookPresentation(
  hook: string,
  maxWords: number,
  maxChars: number,
): { text: string; fontSize: number } {
  const rawWords = hook.trim().split(/\s+/).filter(Boolean).slice(0, maxWords);
  const words: string[] = [];
  for (const word of rawWords) {
    const projected = [...words, word].join(' ');
    if (projected.length > maxChars && words.length >= 3) break;
    words.push(word);
  }

  const visible = words.join(' ');
  const fontSize = visible.length <= 34 ? 52 : visible.length <= 52 ? 46 : 40;
  if (words.length <= 4 || visible.length <= 30) {
    return { text: words.map(escapeAss).join(' '), fontSize };
  }

  let bestBreak = 1;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(' ').length;
    const right = words.slice(i).join(' ').length;
    const delta = Math.abs(left - right);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestBreak = i;
    }
  }

  return {
    text: `${words.slice(0, bestBreak).map(escapeAss).join(' ')}\\N${words.slice(bestBreak).map(escapeAss).join(' ')}`,
    fontSize,
  };
}

function roleStyle(role: EditorialRole): string {
  if (role === 'EMPHASIS') return 'HydraEmphasis';
  if (role === 'PUNCHLINE') return 'HydraPunchline';
  if (role === 'REACTION') return 'HydraReaction';
  return 'HydraDialogue';
}

function roleY(composition: CompositionPlan, role: EditorialRole): number {
  if (role === 'EMPHASIS') return composition.caption.emphasisY;
  if (role === 'PUNCHLINE') return composition.caption.punchlineY;
  if (role === 'REACTION') return composition.caption.reactionY;
  return composition.caption.dialogueY;
}

function roleMotion(role: EditorialRole): string {
  if (role === 'PUNCHLINE') return '{\\fad(35,90)\\fscx116\\fscy116\\t(0,150,\\fscx100\\fscy100)}';
  if (role === 'EMPHASIS') return '{\\fad(45,70)\\fscx108\\fscy108\\t(0,130,\\fscx100\\fscy100)}';
  if (role === 'REACTION') return '{\\fad(40,80)\\fscx110\\fscy110\\t(0,140,\\fscx100\\fscy100)}';
  return '{\\fad(45,65)}';
}

function punchExpression(plan: MagicEditPlan): string | undefined {
  if (!plan.punchIns.length) return undefined;
  const events = plan.punchIns.map(({ start, end }) =>
    `if(between(on/30,${start.toFixed(3)},${end.toFixed(3)}),max(0,min(1,min((on/30-${start.toFixed(3)})/0.18,(${end.toFixed(3)}-on/30)/0.18))),0)`,
  );
  return events.reduce((acc, event) => acc ? `max(${acc},${event})` : event, '');
}

export function buildRenderArgs(
  source: string,
  destination: string,
  subtitlesPath: string,
  clip: ClipCandidate,
  options: RenderOptions = { sourceWidth: 1080, sourceHeight: 1920 },
): string[] {
  const plan = options.plan ?? {
    segments: [{
      sourceStart: clip.startSeconds,
      sourceEnd: clip.endSeconds,
      outputStart: 0,
      outputEnd: clip.endSeconds - clip.startSeconds,
    }],
    silenceCuts: 0,
    removedSeconds: 0,
    punchIns: [],
    emphasisTerms: clip.emphasisTerms ?? [],
    outputDuration: clip.endSeconds - clip.startSeconds,
    audioPolished: true,
    colorPolished: true,
  };

  const coarseStart = Math.max(0, (plan.segments[0]?.sourceStart ?? clip.startSeconds) - 3);
  const filters: string[] = [];
  const pairs: string[] = [];

  plan.segments.forEach((segment, index) => {
    const start = Math.max(0, segment.sourceStart - coarseStart);
    const end = Math.max(start + 0.01, segment.sourceEnd - coarseStart);
    filters.push(
      `[0:v]trim=start=${start.toFixed(3)}:end=${end.toFixed(3)},setpts=PTS-STARTPTS[sv${index}]`,
    );
    filters.push(
      `[0:a]atrim=start=${start.toFixed(3)}:end=${end.toFixed(3)},asetpts=PTS-STARTPTS[sa${index}]`,
    );
    pairs.push(`[sv${index}][sa${index}]`);
  });

  if (plan.segments.length === 1) {
    filters.push('[sv0]null[basev]');
    filters.push('[sa0]anull[basea]');
  } else {
    filters.push(`${pairs.join('')}concat=n=${plan.segments.length}:v=1:a=1[basev][basea]`);
  }

  const aspect = options.sourceHeight > 0 ? options.sourceWidth / options.sourceHeight : 9 / 16;
  const subjectSafe = aspect > 0.82;

  if (subjectSafe) {
    filters.push('[basev]split=2[bg][fg]');
    filters.push('[bg]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,gblur=sigma=18,scale=1080:1920[bg2]');
    filters.push('[fg]scale=1080:1920:force_original_aspect_ratio=decrease[fg2]');
    filters.push('[bg2][fg2]overlay=(W-w)/2:(H-h)/2[framed]');
  } else {
    filters.push('[basev]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[framed]');
  }

  filters.push('[framed]eq=contrast=1.035:saturation=1.045:brightness=0.004,unsharp=5:5:0.22:5:5:0[look]');

  filters.push(`[look]subtitles='${escapeSubtitlePath(subtitlesPath)}'[v]`);
  filters.push('[basea]aresample=async=1:first_pts=0,highpass=f=70,acompressor=threshold=0.10:ratio=2.4:attack=20:release=250:makeup=1.35,loudnorm=I=-16:TP=-1.5:LRA=11[a]');

  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-threads', '1', '-filter_threads', '1', '-filter_complex_threads', '1',
    '-ss', coarseStart.toFixed(3),
    '-i', source,
    '-filter_complex', filters.join(';'),
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
  createPlan(
    transcript: Transcript,
    clip: ClipCandidate,
    platform: PlatformTarget = 'tiktok',
  ): MagicEditPlan {
    return buildMagicEditPlan(transcript, clip, platform);
  }

  async writeSubtitles(
    path: string,
    transcript: Transcript,
    clip: ClipCandidate,
    options: { hook?: string; captionStyle?: CaptionStyle; plan?: MagicEditPlan },
  ): Promise<number> {
    const plan = options.plan ?? buildMagicEditPlan(transcript, clip, options.platform ?? 'tiktok');
    const composition = plan.composition ?? buildCompositionPlan(
      transcript,
      clip,
      options.platform ?? 'tiktok',
    );
    const style = options.captionStyle ?? composition.identity;
    const palette = captionPalette(style);
    const allCues = buildCaptionCues(transcript.words, clip);
    const hookEnd = options.hook?.trim()
      ? Math.min(composition.hook.durationSeconds, plan.outputDuration)
      : 0;
    const cues = allCues
      .map((cue, index) => ({
        cue,
        index,
        role: editorialRoleForCue(cue.words, cue.start, cue.end, clip),
      }))
      .filter(({ cue, index, role }) =>
        shouldRenderCue(composition.captionPolicy, role, index) &&
        cue.start >= hookEnd + 0.12,
      );

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: HydraDialogue,DejaVu Sans,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H20000000,-1,0,0,0,100,100,0,0,1,4,0.6,2,72,220,420,1
Style: HydraEmphasis,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H22000000,-1,0,0,0,100,100,0,0,1,5,0.8,2,72,220,420,1
Style: HydraPunchline,DejaVu Sans,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H26000000,-1,0,0,0,100,100,0,0,1,6,1.0,2,72,220,420,1
Style: HydraReaction,DejaVu Sans,66,&H00FFFFFF,&H00FFFFFF,&H00000000,&H22000000,-1,0,0,0,100,100,0,0,1,5,0.8,2,72,220,420,1
Style: HydraHook,DejaVu Sans,48,&H00FFFFFF,&H00FFFFFF,&H00110B1D,&H620B0817,-1,0,0,0,100,100,0,0,3,3,0,8,72,220,240,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;

    const events: string[] = [];
    if (options.hook?.trim() && hookEnd > 0.5) {
      const hook = hookPresentation(
        options.hook,
        composition.hook.maxWords,
        composition.hook.maxChars,
      );
      events.push(
        `Dialogue: 1,0:00:00.00,${assTime(hookEnd)},HydraHook,,0,0,0,,{\\an8\\pos(${composition.hook.x},${composition.hook.y})\\fs${hook.fontSize}\\fad(100,160)}${hook.text}`,
      );
    }

    let renderedCueCount = 0;
    for (const item of cues) {
      const cue = item.cue;
      const sourceStart = clip.startSeconds + cue.start;
      const sourceEnd = clip.startSeconds + cue.end;
      const start = mapSourceToOutput(sourceStart, plan);
      const end = mapSourceToOutput(sourceEnd, plan);
      if (end <= start + 0.04) continue;
      const y = roleY(composition, item.role);
      events.push(
        `Dialogue: 0,${assTime(start)},${assTime(end)},${roleStyle(item.role)},,0,0,0,,{\\an2\\pos(${composition.caption.x},${y})}${roleMotion(item.role)}${semanticPhrase(cue, plan.emphasisTerms, style)}`,
      );
      renderedCueCount += 1;
    }

    if (!events.length) throw new Error('No hay timestamps para generar subtítulos');
    await writeFile(path, header + events.join('\n') + '\n', 'utf8');
    return renderedCueCount;
  }

  async render(
    source: string,
    destination: string,
    subtitlesPath: string,
    clip: ClipCandidate,
    options: RenderOptions,
  ): Promise<void> {
    await run('ffmpeg', buildRenderArgs(source, destination, subtitlesPath, clip, options));
  }
}

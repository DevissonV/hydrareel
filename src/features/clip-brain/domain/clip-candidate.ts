import { z } from 'zod';

export const clipCandidateSchema = z.object({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(240),
  reason: z.string().min(1).max(300),
  score: z.number().min(0).max(100),
});

export const clipSelectionSchema = z.object({ clips: z.array(clipCandidateSchema) });
export type ClipCandidate = z.infer<typeof clipCandidateSchema>;

export interface ClipPolicy {
  minSeconds: number;
  maxSeconds: number;
  maxClips: number;
}

export function clipPolicyForDuration(
  durationSeconds: number,
  configuredMinSeconds: number,
  configuredMaxSeconds: number,
  configuredMaxClips: number,
): ClipPolicy {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 8) {
    return { minSeconds: 8, maxSeconds: Math.max(8, durationSeconds || 8), maxClips: 0 };
  }

  let minSeconds = configuredMinSeconds;
  let maxSeconds = configuredMaxSeconds;

  if (durationSeconds < 60) {
    minSeconds = Math.min(configuredMinSeconds, 8);
    maxSeconds = Math.min(configuredMaxSeconds, 30, durationSeconds);
  } else if (durationSeconds < 180) {
    minSeconds = Math.min(configuredMinSeconds, 12);
    maxSeconds = Math.min(configuredMaxSeconds, 45, durationSeconds);
  } else {
    maxSeconds = Math.min(configuredMaxSeconds, durationSeconds);
  }

  const maxClips = Math.max(
    1,
    Math.min(configuredMaxClips, Math.floor(durationSeconds / Math.max(minSeconds, 1))),
  );

  return { minSeconds, maxSeconds, maxClips };
}

export function maxClipsForDuration(
  durationSeconds: number,
  minClipSeconds: number,
  configuredMaxClips: number,
): number {
  return clipPolicyForDuration(durationSeconds, minClipSeconds, 60, configuredMaxClips).maxClips;
}

export function validateAndNormalizeCandidates(
  raw: unknown,
  minSeconds: number,
  maxSeconds: number,
  transcriptDuration: number,
  maxClips: number,
): ClipCandidate[] {
  const parsed = clipSelectionSchema.parse(raw);
  const accepted: ClipCandidate[] = [];
  const sorted = [...parsed.clips].sort((a, b) => b.score - a.score);
  for (const candidate of sorted) {
    const start = Math.max(0, candidate.startSeconds);
    const end = Math.min(transcriptDuration, candidate.endSeconds);
    const duration = end - start;
    if (duration < minSeconds || duration > maxSeconds) continue;
    const overlaps = accepted.some((x) => Math.max(start, x.startSeconds) < Math.min(end, x.endSeconds));
    if (overlaps) continue;
    accepted.push({ ...candidate, startSeconds: start, endSeconds: end });
    if (accepted.length >= maxClips) break;
  }
  return accepted.sort((a, b) => a.startSeconds - b.startSeconds);
}

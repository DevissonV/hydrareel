import { z } from 'zod';

export const clipCandidateSchema = z.object({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(240),
  reason: z.string().min(1).max(300),
  score: z.number().min(0).max(100),
});

export const clipSelectionSchema = z.object({ clips: z.array(clipCandidateSchema).max(3) });
export type ClipCandidate = z.infer<typeof clipCandidateSchema>;

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

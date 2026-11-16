import { ClipBrainPort, ClipBrainResult } from '../../clip-brain/application/clip-brain.port';
import { ClipCandidate, validateAndNormalizeCandidates } from '../../clip-brain/domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';

export interface EditorialSelectionResult {
  selected: ClipBrainResult;
  reviewed: ClipBrainResult;
  recovery?: { selected: ClipBrainResult; reviewed: ClipBrainResult; initialReview: ClipBrainResult };
}

/**
 * Editorial score is a ranking signal, not a reason to discard usable footage.
 * Recover ONE already-selected moment only when it contains speech and its
 * word-aligned bounds are technically valid. Rendering, TikTok safe zones and
 * MP4 checks remain exactly the same as for regular clips.
 */
function bestEffortClip(transcript: Transcript, candidates: ClipCandidate[]): ClipBrainResult | undefined {
  const maxSeconds = Math.min(transcript.duration, transcript.duration < 60 ? 30 : 60);
  if (!Number.isFinite(maxSeconds) || maxSeconds < 8) return undefined;

  const usable = candidates
    .flatMap((clip) => {
      if (!Number.isFinite(clip.startSeconds) || !Number.isFinite(clip.endSeconds)) return [];
      const words = transcript.words.filter(
        (word) => word.word.trim() && word.end > clip.startSeconds && word.start < clip.endSeconds,
      );
      const segments = transcript.segments.filter(
        (segment) => segment.text.trim() && segment.end > clip.startSeconds && segment.start < clip.endSeconds,
      );
      const speech = words.length
        ? words.map((word) => word.word).join(' ')
        : segments.map((segment) => segment.text).join(' ');
      // No hallucinated content or mute/empty filler to satisfy a quota.
      if (speech.trim().split(/\s+/).filter(Boolean).length < 3) return [];

      const first = words[0];
      const last = words.at(-1);
      const expanded = first && last ? {
        ...clip,
        startSeconds: Math.max(0, Math.min(clip.startSeconds, first.start - 0.08)),
        endSeconds: Math.min(transcript.duration, Math.max(clip.endSeconds, last.end + 0.12)),
      } : clip;
      const normalized = validateAndNormalizeCandidates(
        { clips: [expanded] }, 8, maxSeconds, transcript.duration, 1,
      );
      return normalized;
    })
    .sort((a, b) => b.score - a.score);

  if (!usable.length) return undefined;
  return {
    clips: [usable[0]],
    usage: { mode: 'best_effort', reason: 'usable_footage_below_editorial_threshold' },
  };
}

/**
 * Preserve high-quality editorial approval when available. On short uploads,
 * avoid a second paid AI request for material that cannot yield distinct clips.
 * For longer videos, try one alternative before falling back to the best usable
 * candidate. Zero clips is reserved for truly unusable material.
 */
export async function selectWithEditorialRecovery(
  brain: Pick<ClipBrainPort, 'select' | 'selectMore' | 'review'>,
  transcript: Transcript,
  visualContext?: string,
): Promise<EditorialSelectionResult> {
  const selected = await brain.select(transcript, visualContext);
  const reviewed = await brain.review(transcript, selected.clips);
  if (reviewed.clips.length) return { selected, reviewed };

  const rescue = bestEffortClip(transcript, selected.clips);
  if (transcript.duration < 60 && rescue) {
    return {
      selected, reviewed: rescue,
      recovery: {
        selected: { clips: [], usage: { skipped: 'short_video_no_distinct_alternatives' } },
        reviewed: rescue, initialReview: reviewed,
      },
    };
  }

  const alternatives = await brain.selectMore(transcript, selected.clips, 2);
  if (!alternatives.clips.length) {
    const outcome = rescue ?? { clips: [], usage: { skipped: 'no_usable_alternatives' } };
    return {
      selected, reviewed: outcome,
      recovery: { selected: alternatives, reviewed: outcome, initialReview: reviewed },
    };
  }

  const secondReview = await brain.review(transcript, alternatives.clips);
  const outcome = secondReview.clips.length
    ? secondReview
    : bestEffortClip(transcript, [...selected.clips, ...alternatives.clips]) ?? secondReview;
  return {
    selected, reviewed: outcome,
    recovery: { selected: alternatives, reviewed: outcome, initialReview: reviewed },
  };
}

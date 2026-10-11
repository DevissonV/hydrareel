import { ClipBrainPort, ClipBrainResult } from '../../clip-brain/application/clip-brain.port';
import { Transcript } from '../../transcription/domain/transcript';

export interface EditorialSelectionResult {
  selected: ClipBrainResult;
  reviewed: ClipBrainResult;
  recovery?: { selected: ClipBrainResult; reviewed: ClipBrainResult; initialReview: ClipBrainResult };
}

/**
 * A single bounded rescue attempt. We reuse the original transcript and never
 * bypass the editorial approval gate to produce an artificial clip quota.
 */
export async function selectWithEditorialRecovery(
  brain: Pick<ClipBrainPort, 'select' | 'selectMore' | 'review'>,
  transcript: Transcript,
  visualContext?: string,
): Promise<EditorialSelectionResult> {
  const selected = await brain.select(transcript, visualContext);
  const reviewed = await brain.review(transcript, selected.clips);
  if (reviewed.clips.length) return { selected, reviewed };

  const alternatives = await brain.selectMore(transcript, selected.clips, 2);
  if (!alternatives.clips.length) {
    return {
      selected, reviewed,
      recovery: { selected: alternatives, reviewed: { clips: [], usage: { skipped: 'no_alternatives' } }, initialReview: reviewed },
    };
  }
  const secondReview = await brain.review(transcript, alternatives.clips);
  return {
    selected, reviewed: secondReview,
    recovery: { selected: alternatives, reviewed: secondReview, initialReview: reviewed },
  };
}

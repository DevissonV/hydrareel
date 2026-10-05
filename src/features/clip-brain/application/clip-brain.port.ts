import { ClipCandidate } from '../domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';

export const CLIP_BRAIN_PORT = Symbol('CLIP_BRAIN_PORT');

export type ClipRegenerationMode = 'shorter' | 'longer' | 'alternative';

export interface ClipBrainResult {
  clips: ClipCandidate[];
  usage?: unknown;
}

export interface ClipBrainPort {
  select(transcript: Transcript): Promise<ClipBrainResult>;
  selectMore(transcript: Transcript, existing: ClipCandidate[], limit?: number): Promise<ClipBrainResult>;
  review(transcript: Transcript, clips: ClipCandidate[]): Promise<ClipBrainResult>;
  regenerate(
    transcript: Transcript,
    original: ClipCandidate,
    mode: ClipRegenerationMode,
  ): Promise<{ clip: ClipCandidate; usage?: unknown }>;
}

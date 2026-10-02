import { ClipCandidate } from '../domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';

export const CLIP_BRAIN_PORT = Symbol('CLIP_BRAIN_PORT');

export interface ClipBrainResult {
  clips: ClipCandidate[];
  usage?: unknown;
}

export interface ClipBrainPort {
  select(transcript: Transcript): Promise<ClipBrainResult>;
  review(transcript: Transcript, clips: ClipCandidate[]): Promise<ClipBrainResult>;
}

import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';
import { MediaMetadata } from '../../media/domain/media-metadata';

export const RENDERING_PORT = Symbol('RENDERING_PORT');

export interface RenderResult {
  durationSeconds: number;
  captionCueCount: number;
  metadata: MediaMetadata;
}

export interface RenderingPort {
  render(source: string, destination: string, subtitlesPath: string, clip: ClipCandidate): Promise<void>;
  writeSubtitles(path: string, transcript: Transcript, clip: ClipCandidate): Promise<number>;
}

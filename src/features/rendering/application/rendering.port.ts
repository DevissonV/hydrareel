import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';

export const RENDERING_PORT = Symbol('RENDERING_PORT');

export type CaptionStyle = 'pulse' | 'clean' | 'neon';

export interface RenderOptions {
  sourceWidth: number;
  sourceHeight: number;
  hook?: string;
  captionStyle?: CaptionStyle;
}

export interface RenderingPort {
  render(
    source: string,
    destination: string,
    subtitlesPath: string,
    clip: ClipCandidate,
    options: RenderOptions,
  ): Promise<void>;
  writeSubtitles(
    path: string,
    transcript: Transcript,
    clip: ClipCandidate,
    options: Pick<RenderOptions, 'hook' | 'captionStyle'>,
  ): Promise<number>;
}

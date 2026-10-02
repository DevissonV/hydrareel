import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';

export const RENDERING_PORT = Symbol('RENDERING_PORT');

export type CaptionStyle = 'pulse' | 'clean' | 'neon';

export interface EditSegment {
  sourceStart: number;
  sourceEnd: number;
  outputStart: number;
  outputEnd: number;
}

export interface PunchIn {
  start: number;
  end: number;
}

export interface MagicEditPlan {
  segments: EditSegment[];
  silenceCuts: number;
  removedSeconds: number;
  punchIns: PunchIn[];
  emphasisTerms: string[];
  outputDuration: number;
  audioPolished: boolean;
  colorPolished: boolean;
}

export interface RenderOptions {
  sourceWidth: number;
  sourceHeight: number;
  hook?: string;
  captionStyle?: CaptionStyle;
  plan?: MagicEditPlan;
}

export interface CaptionOptions {
  hook?: string;
  captionStyle?: CaptionStyle;
  plan?: MagicEditPlan;
}

export interface RenderingPort {
  createPlan(transcript: Transcript, clip: ClipCandidate): MagicEditPlan;
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
    options: CaptionOptions,
  ): Promise<number>;
}

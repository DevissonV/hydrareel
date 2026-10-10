import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';
import { Transcript } from '../../transcription/domain/transcript';
import {
  CompositionPlan,
  PlatformTarget,
  VisualIdentity,
} from '../domain/composition';

export const RENDERING_PORT = Symbol('RENDERING_PORT');

export type CaptionStyle = VisualIdentity;

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
  composition?: CompositionPlan;
}

export interface RenderOptions {
  signal?: AbortSignal;
  sourceWidth: number;
  sourceHeight: number;
  hook?: string;
  captionStyle?: CaptionStyle;
  platform?: PlatformTarget;
  plan?: MagicEditPlan;
}

export interface CaptionOptions {
  hook?: string;
  captionStyle?: CaptionStyle;
  platform?: PlatformTarget;
  plan?: MagicEditPlan;
}

export interface RenderingPort {
  createPlan(
    transcript: Transcript,
    clip: ClipCandidate,
    platform?: PlatformTarget,
  ): MagicEditPlan;
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

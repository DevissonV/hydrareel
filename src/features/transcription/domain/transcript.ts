export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  id?: number;
  text: string;
  start: number;
  end: number;
}

export interface Transcript {
  text: string;
  duration: number;
  words: TranscriptWord[];
  segments: TranscriptSegment[];
  model: string;
  usage?: unknown;
}

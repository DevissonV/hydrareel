export interface MediaMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string;
  hasAudio: boolean;
  formatName: string;
}

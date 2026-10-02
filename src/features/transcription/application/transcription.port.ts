import { Transcript } from '../domain/transcript';

export const TRANSCRIPTION_PORT = Symbol('TRANSCRIPTION_PORT');

export interface TranscriptionPort {
  transcribe(audioPath: string): Promise<Transcript>;
}

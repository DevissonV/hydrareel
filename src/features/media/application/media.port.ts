import { MediaMetadata } from '../domain/media-metadata';

export const MEDIA_PORT = Symbol('MEDIA_PORT');

export interface MediaPort {
  probe(path: string): Promise<MediaMetadata>;
  extractAudio(source: string, destination: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

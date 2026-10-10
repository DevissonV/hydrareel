import { Readable } from 'node:stream';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface UploadedPart {
  partNumber: number;
  etag: string;
  size: number;
}

export interface ObjectStoragePort {
  beginMultipart(key: string, contentType: string): Promise<string>;
  multipartPartUrl(key: string, uploadId: string, partNumber: number): Promise<string>;
  listMultipartParts(key: string, uploadId: string): Promise<UploadedPart[]>;
  completeMultipart(key: string, uploadId: string, parts: UploadedPart[]): Promise<void>;
  abortMultipart(key: string, uploadId: string): Promise<void>;
  objectSize(key: string): Promise<number | null>;
  createUploadUrl(key: string, contentType: string): Promise<string>;
  createDownloadUrl(key: string): Promise<string>;
  createAttachmentUrl(key: string, fileName: string): Promise<string>;
  openReadStream(key: string): Promise<Readable>;
  downloadToFile(key: string, destination: string): Promise<void>;
  uploadFile(key: string, source: string, contentType: string): Promise<void>;
  putJson(key: string, value: unknown): Promise<void>;
  getJson<T>(key: string): Promise<T>;
  listKeys(prefix: string): Promise<string[]>;
  deleteKeys(keys: string[]): Promise<void>;
  deletePrefix(prefix: string): Promise<number>;
  health(): Promise<boolean>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface ObjectStoragePort {
  createUploadUrl(key: string, contentType: string): Promise<string>;
  createDownloadUrl(key: string): Promise<string>;
  downloadToFile(key: string, destination: string): Promise<void>;
  uploadFile(key: string, source: string, contentType: string): Promise<void>;
  putJson(key: string, value: unknown): Promise<void>;
  getJson<T>(key: string): Promise<T>;
  listKeys(prefix: string): Promise<string[]>;
  deleteKeys(keys: string[]): Promise<void>;
  deletePrefix(prefix: string): Promise<number>;
  health(): Promise<boolean>;
}

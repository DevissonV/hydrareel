import { Inject, Injectable } from '@nestjs/common';
import { createWriteStream, createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CONFIG, HydraConfig } from '../../../config';
import { ObjectStoragePort } from '../application/object-storage.port';

@Injectable()
export class RailwayS3Adapter implements ObjectStoragePort {
  private readonly s3: S3Client;

  constructor(@Inject(CONFIG) private readonly config: HydraConfig) {
    this.s3 = new S3Client({
      region: config.bucketRegion,
      endpoint: config.bucketEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.bucketAccessKeyId,
        secretAccessKey: config.bucketSecretAccessKey,
      },
    });
  }

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.config.bucketName, Key: key, ContentType: contentType }),
      { expiresIn: this.config.presignedUrlTtlSeconds },
    );
  }

  async createDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }),
      { expiresIn: this.config.presignedUrlTtlSeconds },
    );
  }

  async createAttachmentUrl(key: string, fileName: string): Promise<string> {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        ResponseContentType: 'video/mp4',
        ResponseContentDisposition: `attachment; filename="${safeName}"`,
      }),
      { expiresIn: this.config.presignedUrlTtlSeconds },
    );
  }

  async downloadToFile(key: string, destination: string): Promise<void> {
    const result = await this.s3.send(new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }));
    if (!result.Body) throw new Error('Storage object has no body');
    await pipeline(result.Body as NodeJS.ReadableStream, createWriteStream(destination));
  }

  async uploadFile(key: string, source: string, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: createReadStream(source),
      ContentType: contentType,
    }));
  }

  async putJson(key: string, value: unknown): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: JSON.stringify(value, null, 2),
      ContentType: 'application/json',
    }));
  }

  async getJson<T>(key: string): Promise<T> {
    const result = await this.s3.send(new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }));
    if (!result.Body) throw new Error('Storage object has no body');
    return JSON.parse(await result.Body.transformToString()) as T;
  }

  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const result = await this.s3.send(new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      for (const object of result.Contents ?? []) if (object.Key) keys.push(object.Key);
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);
    return keys;
  }

  async deleteKeys(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      if (!batch.length) continue;
      await this.s3.send(new DeleteObjectsCommand({
        Bucket: this.config.bucketName,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }));
    }
  }

  async deletePrefix(prefix: string): Promise<number> {
    const keys = await this.listKeys(prefix);
    await this.deleteKeys(keys);
    return keys.length;
  }

  async health(): Promise<boolean> {
    if (!this.config.bucketEndpoint || !this.config.bucketName || !this.config.bucketAccessKeyId || !this.config.bucketSecretAccessKey) return false;
    try {
      await this.s3.send(new ListObjectsV2Command({ Bucket: this.config.bucketName, MaxKeys: 1 }));
      return true;
    } catch {
      return false;
    }
  }
}

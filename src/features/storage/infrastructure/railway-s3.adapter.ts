import { Inject, Injectable } from '@nestjs/common';
import { createWriteStream, createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import {
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

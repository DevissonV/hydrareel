import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStoragePort, UploadedPart } from '../../storage/application/object-storage.port';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { Job } from '../domain/job.entity';

export function verifyMultipartParts(
  sizeBytes: number, partSize: number, parts: UploadedPart[],
): boolean {
  if (!Number.isSafeInteger(sizeBytes) || !Number.isSafeInteger(partSize) || partSize < 5*1024*1024) return false;
  const count = Math.ceil(sizeBytes / partSize);
  if (!count || parts.length !== count) return false;
  return parts.every((part, index) =>
    part.partNumber === index+1 &&
    part.size === Math.min(partSize, sizeBytes-index*partSize) &&
    typeof part.etag === 'string' && part.etag.length > 0,
  );
}

@Injectable()
export class UploadSessionUseCase {
  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  private async owned(jobId: string, clientId: string | undefined): Promise<Job> {
    if (!clientId) throw new BadRequestException('Cliente requerido');
    const job = await this.jobs.get(jobId);
    if (!job || job.clientId !== clientId) throw new NotFoundException('Proyecto no encontrado');
    return job;
  }

  async status(jobId: string, clientId: string | undefined) {
    const job = await this.owned(jobId, clientId);
    const upload = job.upload;
    if (job.status !== 'UPLOADING') {
      return { status: job.status, complete: true, sizeBytes: upload?.sizeBytes ?? null, parts: [] };
    }
    if (!upload?.uploadId) {
      const size = await this.storage.objectSize(job.sourceKey);
      return { status: job.status, mode: 'single', complete: Boolean(size && (!upload?.sizeBytes || size === upload.sizeBytes)),
        sizeBytes: upload?.sizeBytes ?? null, parts: [] };
    }
    const size = await this.storage.objectSize(job.sourceKey);
    if (size === upload.sizeBytes) {
      return { status: job.status, mode: 'multipart', complete: true,
        sizeBytes: upload.sizeBytes, partSize: upload.partSize, parts: [] };
    }
    const parts = await this.storage.listMultipartParts(job.sourceKey, upload.uploadId);
    return { status: job.status, mode: 'multipart', complete: false,
      sizeBytes: upload.sizeBytes, partSize: upload.partSize,
      parts: parts.map(p=>({ partNumber:p.partNumber, size:p.size })) };
  }

  async singleUrl(jobId: string, clientId: string | undefined) {
    const job = await this.owned(jobId, clientId);
    if (job.status !== 'UPLOADING' || job.upload?.uploadId) throw new BadRequestException('El trabajo no admite subida simple');
    return {
      url: await this.storage.createUploadUrl(job.sourceKey, job.contentType),
      headers: { 'Content-Type': job.contentType },
    };
  }

  async partUrl(jobId: string, clientId: string | undefined, partNumber: number) {
    const job = await this.owned(jobId, clientId);
    const upload = job.upload;
    if (job.status !== 'UPLOADING' || !upload?.uploadId) throw new BadRequestException('No hay carga multipart activa');
    const count = Math.ceil(upload.sizeBytes/upload.partSize);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > count) {
      throw new BadRequestException('Número de parte inválido');
    }
    return { url: await this.storage.multipartPartUrl(job.sourceKey, upload.uploadId, partNumber) };
  }

  async complete(jobId: string, clientId: string | undefined) {
    const job = await this.owned(jobId, clientId);
    const upload = job.upload;
    if (job.status !== 'UPLOADING' || !upload?.uploadId) throw new BadRequestException('No hay carga multipart activa');
    const existingSize = await this.storage.objectSize(job.sourceKey);
    if (existingSize === upload.sizeBytes) return { complete:true };
    const parts = await this.storage.listMultipartParts(job.sourceKey, upload.uploadId);
    if (!verifyMultipartParts(upload.sizeBytes, upload.partSize, parts)) {
      throw new BadRequestException('Hay partes pendientes o incompletas');
    }
    await this.storage.completeMultipart(job.sourceKey, upload.uploadId, parts);
    const savedSize = await this.storage.objectSize(job.sourceKey);
    if (savedSize !== upload.sizeBytes) throw new BadRequestException('No se pudo verificar el archivo completo');
    return { complete:true };
  }
}

import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CONFIG, HydraConfig } from '../../../config';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { Job } from '../domain/job.entity';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { validateUploadInput } from './input-validation';

@Injectable()
export class CreateUploadUseCase {
  private creating = false;

  constructor(
    @Inject(CONFIG) private readonly config: HydraConfig,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  async execute(fileName: string, contentType: string, requestedClientId?: string) {
    if (this.creating) throw new ConflictException('Ya se está iniciando otro job');
    this.creating = true;
    try {
      if (await this.jobs.countActive() >= this.config.maxQueuedJobs) {
        throw new ConflictException(`La cola de HydraReel está llena. Máximo ${this.config.maxQueuedJobs} videos pendientes o en proceso.`);
      }
      const { extension } = validateUploadInput(fileName, contentType);
      const id = randomUUID();
      const clientId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedClientId ?? '')
        ? requestedClientId!
        : randomUUID();
      const sourceKey = `sources/${id}/source.${extension}`;
      const job = new Job(id, fileName, sourceKey, contentType || 'application/octet-stream', clientId);
      await this.jobs.save(job);
      const uploadUrl = await this.storage.createUploadUrl(sourceKey, job.contentType);
      return {
        jobId: id,
        clientId,
        uploadUrl,
        method: 'PUT',
        headers: { 'Content-Type': job.contentType },
        maxVideoMinutes: this.config.maxVideoMinutes,
      };
    } finally {
      this.creating = false;
    }
  }
}

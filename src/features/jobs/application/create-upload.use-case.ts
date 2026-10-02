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

  async execute(fileName: string, contentType: string) {
    if (this.creating) throw new ConflictException('Ya se está iniciando otro job');
    this.creating = true;
    try {
      if (await this.jobs.countActive() >= this.config.maxConcurrentJobs) {
        throw new ConflictException('HydraReel MVP permite un solo job simultáneo');
      }
      const { extension } = validateUploadInput(fileName, contentType);
      const id = randomUUID();
      const sourceKey = `sources/${id}/source.${extension}`;
      const job = new Job(id, fileName, sourceKey, contentType || 'application/octet-stream');
      await this.jobs.save(job);
      const uploadUrl = await this.storage.createUploadUrl(sourceKey, job.contentType);
      return {
        jobId: id,
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

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';

@Injectable()
export class GetJobUseCase {
  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  async execute(id: string) {
    const job = await this.jobs.get(id);
    if (!job) throw new NotFoundException('Job no encontrado');
    const clips = await Promise.all(job.clips.map(async (clip) => ({
      ...clip,
      url: await this.storage.createDownloadUrl(clip.key),
    })));
    return {
      id: job.id,
      status: job.status,
      originalFileName: job.originalFileName,
      sourceDuration: job.sourceDuration,
      timings: job.timings,
      clipsGenerated: job.clips.length,
      failureStage: job.failureStage,
      error: job.error,
      clips,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}

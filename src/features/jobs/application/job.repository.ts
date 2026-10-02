import { Inject, Injectable } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { Job, JobSnapshot } from '../domain/job.entity';
import { isTerminal } from '../domain/job-status';

export const JOB_REPOSITORY = Symbol('JOB_REPOSITORY');

export interface JobRepository {
  save(job: Job): Promise<void>;
  get(id: string): Promise<Job | undefined>;
  countActive(): Promise<number>;
  listActive(): Promise<Job[]>;
  listByClient(clientId: string): Promise<Job[]>;
}

@Injectable()
export class DurableJobRepository implements JobRepository {
  private readonly cache = new Map<string, Job>();

  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort) {}

  private key(id: string): string {
    return `job-state/${id}.json`;
  }

  async save(job: Job): Promise<void> {
    this.cache.set(job.id, job);
    await this.storage.putJson(this.key(job.id), job.toSnapshot());
  }

  async get(id: string): Promise<Job | undefined> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    try {
      const snapshot = await this.storage.getJson<JobSnapshot>(this.key(id));
      const job = Job.restore(snapshot);
      this.cache.set(id, job);
      return job;
    } catch {
      return undefined;
    }
  }

  async listActive(): Promise<Job[]> {
    const jobs = await this.listAll();
    return jobs.filter((job) => !isTerminal(job.status) && this.isFresh(job));
  }

  async countActive(): Promise<number> {
    return (await this.listActive()).length;
  }

  async listByClient(clientId: string): Promise<Job[]> {
    return (await this.listAll())
      .filter((job) => job.clientId === clientId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private isFresh(job: Job): boolean {
    if (job.status !== 'UPLOADING') return true;
    return Date.now() - job.updatedAt.getTime() < 4 * 60 * 60 * 1000;
  }

  private async listAll(): Promise<Job[]> {
    const keys = await this.storage.listKeys('job-state/');
    const jobs: Job[] = [];
    for (const key of keys.filter((key) => key.endsWith('.json'))) {
      try {
        const snapshot = await this.storage.getJson<JobSnapshot>(key);
        const job = Job.restore(snapshot);
        this.cache.set(job.id, job);
        jobs.push(job);
      } catch {
        // Ignore a damaged state object.
      }
    }
    return jobs;
  }
}

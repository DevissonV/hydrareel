import { Job } from '../domain/job.entity';
import { isTerminal } from '../domain/job-status';

export const JOB_REPOSITORY = Symbol('JOB_REPOSITORY');

export interface JobRepository {
  save(job: Job): Promise<void>;
  get(id: string): Promise<Job | undefined>;
  countActive(): Promise<number>;
}

export class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, Job>();

  async save(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async get(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async countActive(): Promise<number> {
    let count = 0;
    for (const job of this.jobs.values()) if (!isTerminal(job.status)) count += 1;
    return count;
  }
}

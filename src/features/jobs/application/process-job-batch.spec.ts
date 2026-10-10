import { describe, expect, it, vi } from 'vitest';
import { Job } from '../domain/job.entity';
import { ProcessJobUseCase } from './process-job.use-case';

function makeJob(id: string) {
  const job = new Job(id, id+'.mp4', 'sources/'+id+'/source.mp4', 'video/mp4', 'client');
  job.upload = { sizeBytes: 100, partSize: 100 };
  return job;
}

describe('upload-first batch barrier', () => {
  it('does not start any job if even one source is missing', async () => {
    const a=makeJob('a'), b=makeJob('b');
    const jobs={get:vi.fn(async(id:string)=>id==='a'?a:b),save:vi.fn()};
    const kickQueue=vi.fn();
    const storage={objectSize:vi.fn(async(key:string)=>key.includes('/a/')?100:null)};
    const useCase={jobs,storage,kickQueue};
    await expect(ProcessJobUseCase.prototype.queueBatch.call(useCase as never,['a','b'],'client'))
      .rejects.toThrow('aún no terminó');
    expect(a.status).toBe('UPLOADING');
    expect(b.status).toBe('UPLOADING');
    expect(jobs.save).not.toHaveBeenCalled();
    expect(kickQueue).not.toHaveBeenCalled();
  });

  it('queues all jobs only after every source has been verified', async () => {
    const a=makeJob('a'), b=makeJob('b');
    const jobs={get:vi.fn(async(id:string)=>id==='a'?a:b),save:vi.fn()};
    const kickQueue=vi.fn();
    const storage={objectSize:vi.fn(async()=>100)};
    const useCase={jobs,storage,kickQueue};
    const result=await ProcessJobUseCase.prototype.queueBatch.call(useCase as never,['a','b'],'client');
    expect(result.accepted).toBe(true);
    expect(a.status).toBe('UPLOADED');
    expect(b.status).toBe('UPLOADED');
    expect(jobs.save).toHaveBeenCalledTimes(2);
    expect(kickQueue).toHaveBeenCalledTimes(1);
  });
});

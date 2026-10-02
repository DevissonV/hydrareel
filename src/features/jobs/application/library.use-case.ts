import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { JobClip } from '../domain/job.entity';

interface LibraryManifest {
  id: string;
  clientId: string;
  originalFileName: string;
  sourceKey: string;
  sourceDuration?: number;
  createdAt: string;
  completedAt: string;
  clips: JobClip[];
}

function assertUuid(value: string | undefined, name: string): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException(`${name} inválido`);
  }
  return value;
}

@Injectable()
export class LibraryUseCase {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
  ) {}

  async list(rawClientId?: string) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const [states, manifestKeys] = await Promise.all([
      this.jobs.listByClient(clientId),
      this.storage.listKeys(`clients/${clientId}/jobs/`),
    ]);

    const manifests = new Map<string, LibraryManifest>();
    for (const key of manifestKeys.filter((key) => key.endsWith('.json'))) {
      try {
        const manifest = await this.storage.getJson<LibraryManifest>(key);
        if (manifest.clientId === clientId) manifests.set(manifest.id, manifest);
      } catch {
        // Ignore a damaged legacy manifest instead of breaking the whole library.
      }
    }

    const rows = new Map<string, {
      id: string;
      status: string;
      originalFileName: string;
      sourceDuration?: number;
      createdAt: string;
      updatedAt: string;
      completedAt?: string;
      clips: JobClip[];
      error?: string;
    }>();

    for (const job of states) {
      const manifest = manifests.get(job.id);
      rows.set(job.id, {
        id: job.id,
        status: job.status,
        originalFileName: job.originalFileName,
        sourceDuration: job.sourceDuration ?? manifest?.sourceDuration,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        completedAt: manifest?.completedAt,
        clips: job.clips.length ? job.clips : manifest?.clips ?? [],
        error: job.error,
      });
    }

    for (const manifest of manifests.values()) {
      if (rows.has(manifest.id)) continue;
      rows.set(manifest.id, {
        id: manifest.id,
        status: 'COMPLETED',
        originalFileName: manifest.originalFileName,
        sourceDuration: manifest.sourceDuration,
        createdAt: manifest.createdAt,
        updatedAt: manifest.completedAt,
        completedAt: manifest.completedAt,
        clips: manifest.clips,
      });
    }

    return Promise.all(
      [...rows.values()]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map(async (row) => ({
          ...row,
          clips: await Promise.all(row.clips.map(async (clip) => ({
            ...clip,
            url: await this.storage.createDownloadUrl(clip.key),
          }))),
        })),
    );
  }

  async delete(rawClientId: string | undefined, rawJobId: string) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');
    const manifestKey = `clients/${clientId}/jobs/${jobId}.json`;

    let manifest: LibraryManifest;
    try {
      manifest = await this.storage.getJson<LibraryManifest>(manifestKey);
    } catch {
      throw new NotFoundException('Proyecto no encontrado');
    }
    if (manifest.clientId !== clientId || manifest.id !== jobId) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    let objectsDeleted = 0;
    objectsDeleted += await this.storage.deletePrefix(`sources/${jobId}/`);
    objectsDeleted += await this.storage.deletePrefix(`transcripts/${jobId}/`);
    objectsDeleted += await this.storage.deletePrefix(`outputs/${jobId}/`);
    await this.storage.deleteKeys([manifestKey, `job-state/${jobId}.json`]);
    objectsDeleted += 2;

    return { deleted: true, jobId, objectsDeleted };
  }
}

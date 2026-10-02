import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
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
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort) {}

  async list(rawClientId?: string) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const keys = await this.storage.listKeys(`clients/${clientId}/jobs/`);
    const manifests: LibraryManifest[] = [];
    for (const key of keys.filter((key) => key.endsWith('.json'))) {
      try {
        const manifest = await this.storage.getJson<LibraryManifest>(key);
        if (manifest.clientId === clientId) manifests.push(manifest);
      } catch {
        // Ignore a damaged manifest instead of breaking the whole library.
      }
    }

    manifests.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
    return Promise.all(manifests.map(async (manifest) => ({
      id: manifest.id,
      originalFileName: manifest.originalFileName,
      sourceDuration: manifest.sourceDuration,
      createdAt: manifest.createdAt,
      completedAt: manifest.completedAt,
      clips: await Promise.all(manifest.clips.map(async (clip) => ({
        ...clip,
        url: await this.storage.createDownloadUrl(clip.key),
      }))),
    })));
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
    await this.storage.deleteKeys([manifestKey]);
    objectsDeleted += 1;

    return { deleted: true, jobId, objectsDeleted };
  }
}

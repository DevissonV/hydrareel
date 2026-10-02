import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { JobClip } from '../domain/job.entity';
import { normalizeProjectMetrics, ProjectMetrics } from '../domain/project-metrics';

interface LibraryManifest {
  id: string;
  clientId: string;
  originalFileName: string;
  sourceKey: string;
  sourceDuration?: number;
  createdAt: string;
  completedAt: string;
  processingDurationMs?: number;
  metrics?: ProjectMetrics;
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
      processingDurationMs?: number;
      metrics?: ProjectMetrics;
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
        processingDurationMs: job.timings.totalDurationMs ?? manifest?.processingDurationMs,
        metrics: manifest?.metrics,
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
        processingDurationMs: manifest.processingDurationMs,
        metrics: manifest.metrics,
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

  async metrics(rawClientId?: string) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const [states, manifestKeys] = await Promise.all([
      this.jobs.listByClient(clientId),
      this.storage.listKeys(`clients/${clientId}/jobs/`),
    ]);

    const manifests: LibraryManifest[] = [];
    for (const key of manifestKeys.filter((key) => key.endsWith('.json'))) {
      try {
        const manifest = await this.storage.getJson<LibraryManifest>(key);
        if (manifest.clientId === clientId) manifests.push(manifest);
      } catch {
        // Ignore damaged historical data.
      }
    }

    let originalSeconds = 0;
    let readySeconds = 0;
    let processingMs = 0;
    let processingSamples = 0;
    let clips = 0;
    let transcriptCorrectionSaves = 0;
    let transcriptWordsCorrected = 0;
    let clipsUpdatedFromTranscript = 0;
    let regenerationSucceeded = 0;
    let regenerationFailed = 0;
    let regenerationDurationMs = 0;
    const regenerationRequests = { shorter: 0, longer: 0, alternative: 0, restyle: 0 };

    for (const manifest of manifests) {
      originalSeconds += Number(manifest.sourceDuration ?? 0);
      const currentClips = manifest.clips ?? [];
      clips += currentClips.length;
      readySeconds += currentClips.reduce((sum, clip) => sum + Number(clip.durationSeconds || 0), 0);
      const m = normalizeProjectMetrics(manifest.metrics);
      const duration = Number(manifest.processingDurationMs ?? m.initialProcessingDurationMs ?? 0);
      if (duration > 0) {
        processingMs += duration;
        processingSamples += 1;
      }
      transcriptCorrectionSaves += m.transcriptCorrectionSaves;
      transcriptWordsCorrected += m.transcriptWordsCorrected;
      clipsUpdatedFromTranscript += m.clipsUpdatedFromTranscript;
      regenerationSucceeded += m.regenerationSucceeded;
      regenerationFailed += m.regenerationFailed;
      regenerationDurationMs += m.regenerationDurationMs;
      regenerationRequests.shorter += m.regenerationRequests.shorter;
      regenerationRequests.longer += m.regenerationRequests.longer;
      regenerationRequests.alternative += m.regenerationRequests.alternative;
      regenerationRequests.restyle += m.regenerationRequests.restyle;
    }

    return {
      projectsCompleted: manifests.length,
      projectsFailed: states.filter((job) => job.status === 'FAILED').length,
      originalSeconds: Number(originalSeconds.toFixed(3)),
      clipsGenerated: clips,
      readySeconds: Number(readySeconds.toFixed(3)),
      averageProcessingSeconds: processingSamples
        ? Number((processingMs / processingSamples / 1000).toFixed(2))
        : 0,
      transcriptCorrectionSaves,
      transcriptWordsCorrected,
      clipsUpdatedFromTranscript,
      regenerationRequests,
      regenerationSucceeded,
      regenerationFailed,
      regenerationSuccessRate:
        regenerationSucceeded + regenerationFailed > 0
          ? Number((regenerationSucceeded / (regenerationSucceeded + regenerationFailed)).toFixed(4))
          : null,
      averageRegenerationSeconds: regenerationSucceeded + regenerationFailed > 0
        ? Number((regenerationDurationMs / (regenerationSucceeded + regenerationFailed) / 1000).toFixed(2))
        : 0,
    };
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

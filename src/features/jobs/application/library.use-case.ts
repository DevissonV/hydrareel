import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { JobClip } from '../domain/job.entity';
import { normalizeProjectMetrics, ProjectMetrics } from '../domain/project-metrics';
import { CONFIG, HydraConfig } from '../../../config';

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
  editorialFeedback?: Record<string, { verdict: 'accepted' | 'rejected'; updatedAt: string }>;
}

function assertUuid(value: string | undefined, name: string): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException(`${name} inválido`);
  }
  return value;
}

@Injectable()
export class LibraryUseCase {
  private readonly lastRetentionSweep = new Map<string, number>();

  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(CONFIG) private readonly config: HydraConfig,
  ) {}

  private async purgeProject(clientId: string, jobId: string): Promise<number> {
    const job = await this.jobs.get(jobId);
    if (job?.upload?.uploadId) {
      await this.storage.abortMultipart(job.sourceKey, job.upload.uploadId).catch(() => undefined);
    }
    let deleted = 0;
    deleted += await this.storage.deletePrefix(`sources/${jobId}/`).catch(() => 0);
    deleted += await this.storage.deletePrefix(`transcripts/${jobId}/`).catch(() => 0);
    deleted += await this.storage.deletePrefix(`outputs/${jobId}/`).catch(() => 0);
    await this.storage.deleteKeys([`clients/${clientId}/jobs/${jobId}.json`]).catch(() => undefined);
    await this.jobs.remove(jobId).catch(() => undefined);
    return deleted;
  }

  private async sweepExpiredStorage(clientId: string): Promise<void> {
    const now = Date.now();
    const previous = this.lastRetentionSweep.get(clientId) ?? 0;
    if (now - previous < 60 * 60 * 1000) return;
    this.lastRetentionSweep.set(clientId, now);

    const states = await this.jobs.listByClient(clientId);
    const failedCutoff = now - this.config.failedProjectRetentionHours * 60 * 60 * 1000;
    const uploadCutoff = now - this.config.staleUploadRetentionHours * 60 * 60 * 1000;

    for (const job of states) {
      const updatedAt = job.updatedAt.getTime();
      if ((job.status === 'FAILED' || job.status === 'CANCELLED') && updatedAt < failedCutoff) {
        await this.purgeProject(clientId, job.id);
      } else if (job.status === 'UPLOADING' && updatedAt < uploadCutoff) {
        await this.purgeProject(clientId, job.id);
      }
    }
  }

  async list(rawClientId?: string) {
    const clientId = assertUuid(rawClientId, 'clientId');
    await this.sweepExpiredStorage(clientId);
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
        clips: (job.clips.length ? job.clips : manifest?.clips ?? []).map((clip) => ({
          ...clip,
          feedback: manifest?.editorialFeedback?.[String(clip.index)]?.verdict ?? null,
        })),
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
        clips: manifest.clips.map((clip) => ({
          ...clip,
          feedback: manifest.editorialFeedback?.[String(clip.index)]?.verdict ?? null,
        })),
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
    await this.sweepExpiredStorage(clientId);
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
    let feedbackAccepted = 0;
    let feedbackRejected = 0;
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
      for (const entry of Object.values(manifest.editorialFeedback ?? {})) {
        if (entry.verdict === 'accepted') feedbackAccepted += 1;
        if (entry.verdict === 'rejected') feedbackRejected += 1;
      }
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
      feedbackAccepted,
      feedbackRejected,
      feedbackAcceptanceRate: feedbackAccepted + feedbackRejected > 0
        ? Number((feedbackAccepted / (feedbackAccepted + feedbackRejected)).toFixed(4))
        : null,
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

  async feedback(
    rawClientId: string | undefined,
    rawJobId: string,
    rawClipIndex: string,
    verdict: unknown,
  ) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');
    const clipIndex = Number(rawClipIndex);
    if (!Number.isInteger(clipIndex) || clipIndex < 1) {
      throw new BadRequestException('clipIndex inválido');
    }
    if (verdict !== 'accepted' && verdict !== 'rejected') {
      throw new BadRequestException('verdict debe ser accepted o rejected');
    }
    const key = `clients/${clientId}/jobs/${jobId}.json`;
    let manifest: LibraryManifest;
    try {
      manifest = await this.storage.getJson<LibraryManifest>(key);
    } catch {
      throw new NotFoundException('Proyecto no encontrado');
    }
    if (manifest.clientId !== clientId || manifest.id !== jobId) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    if (!manifest.clips.some((clip) => clip.index === clipIndex)) {
      throw new NotFoundException('Clip no encontrado');
    }
    manifest.editorialFeedback = {
      ...(manifest.editorialFeedback ?? {}),
      [String(clipIndex)]: { verdict, updatedAt: new Date().toISOString() },
    };
    await this.storage.putJson(key, manifest);
    return { clipIndex, verdict, saved: true };
  }

  async download(
    rawClientId: string | undefined,
    rawJobId: string,
    rawClipIndex: string,
  ) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');
    const clipIndex = Number.parseInt(rawClipIndex, 10);
    if (!Number.isInteger(clipIndex) || clipIndex < 1) throw new BadRequestException('clipIndex inválido');

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

    const clip = manifest.clips.find((item) => item.index === clipIndex);
    if (!clip) throw new NotFoundException('Clip no encontrado');

    return {
      url: await this.storage.createAttachmentUrl(
        clip.key,
        `hydrareel-clip-${String(clip.index).padStart(2, '0')}.mp4`,
      ),
    };
  }

  async file(
    rawClientId: string | undefined,
    rawJobId: string,
    rawClipIndex: string,
  ) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');
    const clipIndex = Number.parseInt(rawClipIndex, 10);
    if (!Number.isInteger(clipIndex) || clipIndex < 1) throw new BadRequestException('clipIndex inválido');

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

    const clip = manifest.clips.find((item) => item.index === clipIndex);
    if (!clip) throw new NotFoundException('Clip no encontrado');

    return {
      stream: await this.storage.openReadStream(clip.key),
      fileName: `hydrareel-clip-${String(clip.index).padStart(2, '0')}.mp4`,
    };
  }

  async delete(rawClientId: string | undefined, rawJobId: string) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');
    const manifestKey = `clients/${clientId}/jobs/${jobId}.json`;

    const job = await this.jobs.get(jobId);
    let manifest: LibraryManifest | undefined;
    try {
      manifest = await this.storage.getJson<LibraryManifest>(manifestKey);
    } catch {
      manifest = undefined;
    }

    const ownedByJob = Boolean(job && job.clientId === clientId);
    const ownedByManifest = Boolean(manifest && manifest.clientId === clientId && manifest.id === jobId);
    if (!ownedByJob && !ownedByManifest) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (job && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException('Espera a que el proyecto termine antes de eliminarlo');
    }

    let objectsDeleted = 0;
    objectsDeleted += await this.storage.deletePrefix(`sources/${jobId}/`);
    objectsDeleted += await this.storage.deletePrefix(`transcripts/${jobId}/`);
    objectsDeleted += await this.storage.deletePrefix(`outputs/${jobId}/`);

    if (manifest) {
      await this.storage.deleteKeys([manifestKey]);
      objectsDeleted += 1;
    }
    if (job) {
      await this.jobs.remove(jobId);
      objectsDeleted += 1;
    } else {
      await this.storage.deleteKeys([`job-state/${jobId}.json`]).catch(() => undefined);
    }

    return { deleted: true, jobId, objectsDeleted };
  }
}

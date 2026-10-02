import { Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { CONFIG, HydraConfig } from '../../../config';
import { jobLog } from '../../../logger';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { MEDIA_PORT, MediaPort } from '../../media/application/media.port';
import { TRANSCRIPTION_PORT, TranscriptionPort } from '../../transcription/application/transcription.port';
import { CLIP_BRAIN_PORT, ClipBrainPort } from '../../clip-brain/application/clip-brain.port';
import { RENDERING_PORT, RenderingPort } from '../../rendering/application/rendering.port';
import { validateMediaDuration } from './input-validation';
import { RenderGate } from './render-gate';
import { emptyProjectMetrics } from '../domain/project-metrics';

@Injectable()
export class ProcessJobUseCase implements OnModuleInit {
  private runningJobId?: string;

  constructor(
    @Inject(CONFIG) private readonly config: HydraConfig,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(MEDIA_PORT) private readonly media: MediaPort,
    @Inject(TRANSCRIPTION_PORT) private readonly transcription: TranscriptionPort,
    @Inject(CLIP_BRAIN_PORT) private readonly clipBrain: ClipBrainPort,
    @Inject(RENDERING_PORT) private readonly rendering: RenderingPort,
    private readonly renderGate: RenderGate,
  ) {}

  onModuleInit(): void {
    setImmediate(() => void this.recoverPendingJobs());
  }

  private async recoverPendingJobs(): Promise<void> {
    if (this.runningJobId) return;
    const pending = (await this.jobs.listActive())
      .filter((job) => job.status !== 'UPLOADING')
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

    for (const job of pending) {
      if (this.runningJobId) break;
      jobLog(job.id, 'startup_recovery_started', { previousStatus: job.status });
      job.recoverForRetry();
      await this.storage.deletePrefix(`outputs/${job.id}/`).catch(() => 0);
      await this.jobs.save(job);
      this.runningJobId = job.id;
      try {
        await this.run(job.id);
      } finally {
        if (this.runningJobId === job.id) this.runningJobId = undefined;
      }
    }
  }

  async markUploadedAndStart(jobId: string): Promise<void> {
    const job = await this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job no encontrado');
    if (job.status !== 'UPLOADING') throw new Error(`Job no está en UPLOADING: ${job.status}`);
    if (this.runningJobId && this.runningJobId !== jobId) throw new Error('Ya existe un job procesándose');
    job.transition('UPLOADED');
    await this.jobs.save(job);
    this.runningJobId = jobId;
    setImmediate(() => void this.run(jobId).finally(() => {
      if (this.runningJobId === jobId) this.runningJobId = undefined;
    }));
  }

  private async run(jobId: string): Promise<void> {
    const job = await this.jobs.get(jobId);
    if (!job) return;
    const started = Date.now();
    const dir = path.join(os.tmpdir(), 'hydrareel', job.id);
    const sourcePath = path.join(dir, `source.${job.sourceKey.split('.').pop() ?? 'mp4'}`);
    const audioPath = path.join(dir, 'audio.mp3');
    try {
      await mkdir(dir, { recursive: true });
      jobLog(job.id, 'processing_started');
      await this.storage.downloadToFile(job.sourceKey, sourcePath);
      const sourceMeta = await this.media.probe(sourcePath);
      validateMediaDuration(sourceMeta.durationSeconds, this.config.maxVideoMinutes);
      if (!sourceMeta.hasAudio) throw new Error('El video no contiene audio');
      if (!sourceMeta.width || !sourceMeta.height) throw new Error('Resolución de video inválida');
      job.sourceDuration = sourceMeta.durationSeconds;
      jobLog(job.id, 'source_validated', { sourceDuration: sourceMeta.durationSeconds, resolution: `${sourceMeta.width}x${sourceMeta.height}`, codec: sourceMeta.videoCodec, audioCodec: sourceMeta.audioCodec });

      job.transition('TRANSCRIBING');
      await this.jobs.save(job);
      const t0 = Date.now();
      await this.media.extractAudio(sourcePath, audioPath);
      const transcript = await this.transcription.transcribe(audioPath);
      job.timings.transcriptionDurationMs = Date.now() - t0;
      job.usage.transcription = transcript.usage;
      await this.storage.putJson(`transcripts/${job.id}/transcript.json`, { jobId: job.id, duration: transcript.duration, text: transcript.text, words: transcript.words, segments: transcript.segments });
      jobLog(job.id, 'transcription_completed', { transcriptionDurationMs: job.timings.transcriptionDurationMs, words: transcript.words.length, segments: transcript.segments.length, model: transcript.model });

      job.transition('ANALYZING');
      await this.jobs.save(job);
      const a0 = Date.now();
      const selected = await this.clipBrain.select(transcript);
      const reviewed = await this.clipBrain.review(transcript, selected.clips);
      job.timings.analysisDurationMs = Date.now() - a0;
      job.usage.analysis = { selection: selected.usage, editorialReview: reviewed.usage };
      jobLog(job.id, 'analysis_completed', {
        analysisDurationMs: job.timings.analysisDurationMs,
        candidatesSelected: selected.clips.length,
        candidatesApproved: reviewed.clips.length,
        model: this.config.openaiClipModel,
      });

      job.transition('RENDERING');
      await this.jobs.save(job);
      const r0 = Date.now();
      const releaseRender = await this.renderGate.acquire(`job:${job.id}`);
      try {
      for (const [index, clip] of reviewed.clips.slice(0, this.config.maxClipsPerJob).entries()) {
        const number = String(index + 1).padStart(2, '0');
        const subtitlesPath = path.join(dir, `clip-${number}.ass`);
        const outputPath = path.join(dir, `clip-${number}.mp4`);
        const captionStyle = 'pulse' as const;
        const framing = sourceMeta.width / sourceMeta.height > 0.82 ? 'subject-safe' as const : 'fill' as const;
        const plan = this.rendering.createPlan(transcript, clip);
        const captionCueCount = await this.rendering.writeSubtitles(subtitlesPath, transcript, clip, {
          hook: clip.hook,
          captionStyle,
          plan,
        });
        await this.rendering.render(sourcePath, outputPath, subtitlesPath, clip, {
          sourceWidth: sourceMeta.width,
          sourceHeight: sourceMeta.height,
          hook: clip.hook,
          captionStyle,
          plan,
        });
        const outputMeta = await this.media.probe(outputPath);
        if (outputMeta.width !== 1080 || outputMeta.height !== 1920) throw new Error(`Clip ${number} no es 1080x1920`);
        if (outputMeta.videoCodec !== 'h264') throw new Error(`Clip ${number} no es H.264`);
        if (!outputMeta.hasAudio || outputMeta.audioCodec !== 'aac') throw new Error(`Clip ${number} no tiene AAC`);
        const key = `outputs/${job.id}/clip-${number}.mp4`;
        await this.storage.uploadFile(key, outputPath, 'video/mp4');
        job.clips.push({
          index: index + 1,
          key,
          title: clip.title,
          hook: clip.hook,
          socialCaption: clip.socialCaption,
          hashtags: clip.hashtags,
          emphasisTerms: clip.emphasisTerms,
          magicEdit: {
            silenceCuts: plan.silenceCuts,
            removedSeconds: plan.removedSeconds,
            punchIns: plan.punchIns.length,
            audioPolished: plan.audioPolished,
            colorPolished: plan.colorPolished,
          },
          captionStyle,
          framing,
          durationSeconds: outputMeta.durationSeconds,
          score: clip.score,
          reason: clip.reason,
          startSeconds: clip.startSeconds,
          endSeconds: clip.endSeconds,
          captionCueCount,
          video: { width: outputMeta.width, height: outputMeta.height, codec: outputMeta.videoCodec, audioCodec: outputMeta.audioCodec },
        });
        await this.jobs.save(job);
        jobLog(job.id, 'clip_rendered', {
          clip: index + 1,
          key,
          durationSeconds: outputMeta.durationSeconds,
          captionCueCount,
          magicEdit: {
            silenceCuts: plan.silenceCuts,
            removedSeconds: plan.removedSeconds,
            punchIns: plan.punchIns.length,
            emphasisTerms: plan.emphasisTerms.length,
          },
        });
      }
      } finally {
        releaseRender();
      }
      job.timings.renderDurationMs = Date.now() - r0;
      job.timings.totalDurationMs = Date.now() - started;
      const completedAt = new Date().toISOString();
      const metrics = emptyProjectMetrics();
      metrics.initialClipsGenerated = job.clips.length;
      metrics.initialOutputDurationSeconds = Number(
        job.clips.reduce((sum, clip) => sum + Number(clip.durationSeconds || 0), 0).toFixed(3),
      );
      metrics.initialProcessingDurationMs = job.timings.totalDurationMs ?? 0;
      await this.storage.putJson(`clients/${job.clientId}/jobs/${job.id}.json`, {
        id: job.id,
        clientId: job.clientId,
        originalFileName: job.originalFileName,
        sourceKey: job.sourceKey,
        sourceDuration: job.sourceDuration,
        createdAt: job.createdAt.toISOString(),
        completedAt,
        processingDurationMs: job.timings.totalDurationMs,
        metrics,
        clips: job.clips,
      });
      job.transition('COMPLETED');
      await this.jobs.save(job);
      jobLog(job.id, 'job_completed', {
        sourceDuration: job.sourceDuration,
        ...job.timings,
        clipsGenerated: job.clips.length,
        failureStage: null,
        usage: job.usage,
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const publicMessage =
        /ffmpeg|exited null|SIGKILL|killed|ENOMEM|out of memory/i.test(rawMessage)
          ? 'No pudimos terminar la edición de este video. El original quedó guardado para que puedas intentarlo de nuevo.'
          : rawMessage.includes('"code"') || rawMessage.length > 500
            ? 'No pudimos completar esta edición. Intenta de nuevo con el mismo video.'
            : rawMessage;
      job.timings.totalDurationMs = Date.now() - started;
      job.fail(job.status, publicMessage);
      await this.jobs.save(job);
      jobLog(job.id, 'job_failed', {
        sourceDuration: job.sourceDuration,
        ...job.timings,
        clipsGenerated: job.clips.length,
        failureStage: job.failureStage,
        error: rawMessage,
      });
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

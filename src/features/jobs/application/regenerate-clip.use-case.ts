import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { MEDIA_PORT, MediaPort } from '../../media/application/media.port';
import { CLIP_BRAIN_PORT, ClipBrainPort } from '../../clip-brain/application/clip-brain.port';
import { RENDERING_PORT, RenderingPort, CaptionStyle } from '../../rendering/application/rendering.port';
import { Transcript } from '../../transcription/domain/transcript';
import { ClipCandidate } from '../../clip-brain/domain/clip-candidate';
import { JobClip } from '../domain/job.entity';
import { RenderGate } from './render-gate';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { normalizeProjectMetrics, ProjectMetrics } from '../domain/project-metrics';
import { buildLayoutPreflight } from '../../rendering/domain/composition';
import { HeavyWorkQueue } from './heavy-work-queue';

type RegenerateMode = 'shorter' | 'longer' | 'alternative' | 'restyle';

interface LibraryManifest {
  id: string;
  clientId: string;
  originalFileName: string;
  sourceKey: string;
  sourceDuration?: number;
  createdAt: string;
  completedAt: string;
  metrics?: ProjectMetrics;
  clips: JobClip[];
}

function assertUuid(value: string | undefined, name: string): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException(`${name} inválido`);
  }
  return value;
}

function assertMode(value: unknown): RegenerateMode {
  if (value === 'shorter' || value === 'longer' || value === 'alternative' || value === 'restyle') return value;
  throw new BadRequestException('mode inválido');
}

function nextStyle(current: CaptionStyle): CaptionStyle {
  if (current === 'pulse') return 'clean';
  if (current === 'clean') return 'neon';
  return 'pulse';
}

export function replaceWholeText(value: string, from: string, to: string): string {
  const needle = from.trim();
  const replacement = to.trim();
  if (!needle || !replacement) return value;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('(?<![\\p{L}\\p{N}_])' + escaped + '(?![\\p{L}\\p{N}_])', 'giu');
  return value.replace(pattern, replacement);
}

@Injectable()
export class RegenerateClipUseCase {

  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(MEDIA_PORT) private readonly media: MediaPort,
    @Inject(CLIP_BRAIN_PORT) private readonly clipBrain: ClipBrainPort,
    @Inject(RENDERING_PORT) private readonly rendering: RenderingPort,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    private readonly renderGate: RenderGate,
    private readonly heavyWork: HeavyWorkQueue,
  ) {}

  async execute(
    rawClientId: string | undefined,
    rawJobId: string,
    rawClipIndex: string,
    body: { mode?: unknown; captionStyle?: unknown },
  ) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');
    const clipIndex = Number.parseInt(rawClipIndex, 10);
    if (!Number.isInteger(clipIndex) || clipIndex < 1) throw new BadRequestException('clipIndex inválido');
    const mode = assertMode(body.mode);

    return this.heavyWork.enqueue(
      `manual:${jobId}:${clipIndex}`,
      () => this.executeNow(clientId, jobId, clipIndex, mode, body),
      { priority: 0, coalesce: true },
    );
  }

  private async executeNow(
    clientId: string,
    jobId: string,
    clipIndex: number,
    mode: RegenerateMode,
    body: { mode?: unknown; captionStyle?: unknown },
  ) {
    const started = Date.now();
    let manifestForMetrics: LibraryManifest | undefined;
    let requestRecorded = false;
    const releaseRender = await this.renderGate.acquire(`regenerate:${jobId}:${clipIndex}`);

    const manifestKey = `clients/${clientId}/jobs/${jobId}.json`;
    const dir = path.join(os.tmpdir(), 'hydrareel-regenerate', jobId, String(clipIndex));
    const sourcePath = path.join(dir, 'source.mp4');
    const subtitlesPath = path.join(dir, 'captions.ass');
    const outputPath = path.join(dir, 'output.mp4');

    try {
      let manifest: LibraryManifest;
      try {
        manifest = await this.storage.getJson<LibraryManifest>(manifestKey);
      } catch {
        throw new NotFoundException('Proyecto no encontrado');
      }
      if (manifest.clientId !== clientId || manifest.id !== jobId) throw new NotFoundException('Proyecto no encontrado');
      manifestForMetrics = manifest;
      const requestMetrics = normalizeProjectMetrics(manifest.metrics);
      requestMetrics.regenerationRequests[mode] += 1;
      manifest.metrics = requestMetrics;
      await this.storage.putJson(manifestKey, manifest);
      requestRecorded = true;

      const original = manifest.clips.find((clip) => clip.index === clipIndex);
      if (!original) throw new NotFoundException('Clip no encontrado');

      const storedTranscript = await this.storage.getJson<Omit<Transcript, 'model'> & { model?: string }>(
        `transcripts/${jobId}/transcript.json`,
      );
      const transcript: Transcript = { ...storedTranscript, model: storedTranscript.model ?? 'stored-transcript' };

      await mkdir(dir, { recursive: true });
      await this.storage.downloadToFile(manifest.sourceKey, sourcePath);
      const sourceMeta = await this.media.probe(sourcePath);
      if (!sourceMeta.width || !sourceMeta.height || !sourceMeta.hasAudio) {
        throw new Error('El source del proyecto no es válido para regenerar');
      }

      const originalCandidate: ClipCandidate = {
        startSeconds: original.startSeconds,
        endSeconds: original.endSeconds,
        title: original.title,
        hook: original.hook ?? original.title,
        reason: original.reason,
        socialCaption: original.socialCaption ?? original.reason,
        hashtags: original.hashtags?.length ? original.hashtags : ['#HydraReel'],
        emphasisTerms: original.emphasisTerms ?? [],
        score: original.score,
      };

      const generated = mode === 'restyle'
        ? { clip: originalCandidate }
        : await this.clipBrain.regenerate(transcript, originalCandidate, mode);

      const requestedStyle = body.captionStyle;
      const captionStyle: CaptionStyle =
        requestedStyle === 'pulse' || requestedStyle === 'clean' || requestedStyle === 'neon'
          ? requestedStyle
          : mode === 'restyle'
            ? nextStyle(original.captionStyle ?? 'pulse')
            : original.captionStyle ?? 'pulse';

      const framing = sourceMeta.width / sourceMeta.height > 0.82 ? 'subject-safe' as const : 'fill' as const;
      const plan = this.rendering.createPlan(transcript, generated.clip);
      const captionCueCount = await this.rendering.writeSubtitles(
        subtitlesPath,
        transcript,
        generated.clip,
        { hook: generated.clip.hook, captionStyle, plan },
      );
      await this.rendering.render(sourcePath, outputPath, subtitlesPath, generated.clip, {
        sourceWidth: sourceMeta.width,
        sourceHeight: sourceMeta.height,
        hook: generated.clip.hook,
        captionStyle,
        plan,
      });

      const outputMeta = await this.media.probe(outputPath);
      const version = Date.now();
      const key = `outputs/${jobId}/clip-${String(clipIndex).padStart(2, '0')}-v${version}.mp4`;
      await this.storage.uploadFile(key, outputPath, 'video/mp4');

      const updated: JobClip = {
        index: clipIndex,
        key,
        generatedAt: new Date().toISOString(),
        title: generated.clip.title,
        hook: generated.clip.hook,
        socialCaption: generated.clip.socialCaption,
        hashtags: generated.clip.hashtags,
        emphasisTerms: generated.clip.emphasisTerms,
        magicEdit: {
          silenceCuts: plan.silenceCuts,
          removedSeconds: plan.removedSeconds,
          punchIns: plan.punchIns.length,
          audioPolished: plan.audioPolished,
          colorPolished: plan.colorPolished,
        },
        captionStyle,
        captionPolicy: plan.composition?.captionPolicy,
        platform: plan.composition?.platform ?? 'tiktok',
        preflight: plan.composition ? buildLayoutPreflight(plan.composition) : undefined,
        framing,
        durationSeconds: outputMeta.durationSeconds,
        score: generated.clip.score,
        reason: generated.clip.reason,
        startSeconds: generated.clip.startSeconds,
        endSeconds: generated.clip.endSeconds,
        captionCueCount,
        video: {
          width: outputMeta.width,
          height: outputMeta.height,
          codec: outputMeta.videoCodec,
          audioCodec: outputMeta.audioCodec,
        },
      };

      manifest.clips = manifest.clips.map((clip) => clip.index === clipIndex ? updated : clip);
      manifest.completedAt = new Date().toISOString();
      const successMetrics = normalizeProjectMetrics(manifest.metrics);
      successMetrics.regenerationSucceeded += 1;
      successMetrics.regenerationDurationMs += Date.now() - started;
      manifest.metrics = successMetrics;
      await this.storage.putJson(manifestKey, manifest);

      const job = await this.jobs.get(jobId);
      if (job && job.clientId === clientId) {
        job.clips = job.clips.map((clip) => clip.index === clipIndex ? updated : clip);
        await this.jobs.save(job);
      }

      if (original.key !== key) await this.storage.deleteKeys([original.key]).catch(() => undefined);

      return {
        ...updated,
        url: await this.storage.createDownloadUrl(updated.key),
      };
    } catch (error) {
      if (manifestForMetrics && requestRecorded) {
        const failureMetrics = normalizeProjectMetrics(manifestForMetrics.metrics);
        failureMetrics.regenerationFailed += 1;
        failureMetrics.regenerationDurationMs += Date.now() - started;
        manifestForMetrics.metrics = failureMetrics;
        await this.storage.putJson(manifestKey, manifestForMetrics).catch(() => undefined);
      }
      throw error;
    } finally {
      releaseRender();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async findMore(
    rawClientId: string | undefined,
    rawJobId: string,
  ): Promise<{ added: number; clips: JobClip[] }> {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');

    return this.heavyWork.enqueue(
      `manual:${jobId}:find-more`,
      () => this.findMoreNow(clientId, jobId),
      { priority: 0, coalesce: true },
    );
  }

  private async findMoreNow(
    clientId: string,
    jobId: string,
  ): Promise<{ added: number; clips: JobClip[] }> {
    const releaseRender = await this.renderGate.acquire(`find-more:${jobId}`);
    const manifestKey = `clients/${clientId}/jobs/${jobId}.json`;
    const dir = path.join(os.tmpdir(), 'hydrareel-find-more', jobId);
    const sourcePath = path.join(dir, 'source.mp4');

    try {
      const manifest = await this.storage.getJson<LibraryManifest>(manifestKey);
      if (manifest.clientId !== clientId || manifest.id !== jobId) {
        throw new NotFoundException('Proyecto no encontrado');
      }

      const storedTranscript = await this.storage.getJson<Omit<Transcript, 'model'> & { model?: string }>(
        `transcripts/${jobId}/transcript.json`,
      );
      const transcript: Transcript = {
        ...storedTranscript,
        model: storedTranscript.model ?? 'stored-transcript',
      };

      const existingCandidates: ClipCandidate[] = manifest.clips.map((clip) => ({
        startSeconds: clip.startSeconds,
        endSeconds: clip.endSeconds,
        title: clip.title,
        hook: clip.hook ?? clip.title,
        reason: clip.reason,
        socialCaption: clip.socialCaption ?? clip.reason,
        hashtags: clip.hashtags?.length ? clip.hashtags : ['#viral', '#fyp', '#video', '#shorts', '#HydraReel'],
        emphasisTerms: clip.emphasisTerms ?? [],
        score: clip.score,
      }));

      const more = await this.clipBrain.selectMore(transcript, existingCandidates, 2);
      if (!more.clips.length) return { added: 0, clips: [] };

      await mkdir(dir, { recursive: true });
      await this.storage.downloadToFile(manifest.sourceKey, sourcePath);
      const sourceMeta = await this.media.probe(sourcePath);
      if (!sourceMeta.width || !sourceMeta.height || !sourceMeta.hasAudio) {
        throw new Error('El source del proyecto no es válido para generar más clips');
      }

      let nextIndex = Math.max(0, ...manifest.clips.map((clip) => clip.index)) + 1;
      const added: JobClip[] = [];
      for (const candidate of more.clips) {
        const index = nextIndex++;
        const subtitlesPath = path.join(dir, `captions-${index}.ass`);
        const outputPath = path.join(dir, `output-${index}.mp4`);
        const framing = sourceMeta.width / sourceMeta.height > 0.82 ? 'subject-safe' as const : 'fill' as const;
        const plan = this.rendering.createPlan(transcript, candidate);
        const captionStyle: CaptionStyle = plan.composition?.identity ?? 'clean';
        const captionCueCount = await this.rendering.writeSubtitles(
          subtitlesPath,
          transcript,
          candidate,
          { hook: candidate.hook, captionStyle, plan },
        );
        await this.rendering.render(sourcePath, outputPath, subtitlesPath, candidate, {
          sourceWidth: sourceMeta.width,
          sourceHeight: sourceMeta.height,
          hook: candidate.hook,
          captionStyle,
          plan,
        });

        const outputMeta = await this.media.probe(outputPath);
        const key = `outputs/${jobId}/clip-${String(index).padStart(2, '0')}-extra-${Date.now()}.mp4`;
        await this.storage.uploadFile(key, outputPath, 'video/mp4');

        const clip: JobClip = {
          index,
          key,
          generatedAt: new Date().toISOString(),
          title: candidate.title,
          hook: candidate.hook,
          socialCaption: candidate.socialCaption,
          hashtags: candidate.hashtags,
          emphasisTerms: candidate.emphasisTerms,
          magicEdit: {
            silenceCuts: plan.silenceCuts,
            removedSeconds: plan.removedSeconds,
            punchIns: plan.punchIns.length,
            audioPolished: plan.audioPolished,
            colorPolished: plan.colorPolished,
          },
          captionStyle,
          captionPolicy: plan.composition?.captionPolicy,
          platform: plan.composition?.platform ?? 'tiktok',
          preflight: plan.composition ? buildLayoutPreflight(plan.composition) : undefined,
          framing,
          durationSeconds: outputMeta.durationSeconds,
          score: candidate.score,
          reason: candidate.reason,
          startSeconds: candidate.startSeconds,
          endSeconds: candidate.endSeconds,
          captionCueCount,
          video: {
            width: outputMeta.width,
            height: outputMeta.height,
            codec: outputMeta.videoCodec,
            audioCodec: outputMeta.audioCodec,
          },
        };
        manifest.clips.push(clip);
        added.push(clip);
      }

      manifest.completedAt = new Date().toISOString();
      await this.storage.putJson(manifestKey, manifest);

      const job = await this.jobs.get(jobId);
      if (job && job.clientId === clientId) {
        job.clips = [...manifest.clips];
        await this.jobs.save(job);
      }

      return { added: added.length, clips: added };
    } finally {
      releaseRender();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async refreshFromCorrectedTranscript(
    clientId: string,
    jobId: string,
    replacements: Array<{ from: string; to: string }> = [],
    clipIndices?: number[],
  ): Promise<number> {
    const scope = clipIndices?.length === 1 ? String(clipIndices[0]) : 'all';
    return this.heavyWork.enqueue(
      `transcript:${jobId}:${scope}`,
      () => this.refreshFromCorrectedTranscriptNow(clientId, jobId, replacements, clipIndices),
      { priority: 0, coalesce: true },
    );
  }

  private async refreshFromCorrectedTranscriptNow(
    clientId: string,
    jobId: string,
    replacements: Array<{ from: string; to: string }> = [],
    clipIndices?: number[],
  ): Promise<number> {
    const releaseRender = await this.renderGate.acquire(`transcript:${jobId}`);
    const manifestKey = `clients/${clientId}/jobs/${jobId}.json`;
    const dir = path.join(os.tmpdir(), 'hydrareel-transcript-refresh', jobId);
    const sourcePath = path.join(dir, `source.${jobId}.mp4`);

    const replaceText = (value: string): string => {
      let result = value;
      for (const replacement of replacements) {
        result = replaceWholeText(result, replacement.from, replacement.to);
      }
      return result;
    };

    try {
      const manifest = await this.storage.getJson<LibraryManifest>(manifestKey);
      if (manifest.clientId !== clientId || manifest.id !== jobId) {
        throw new NotFoundException('Proyecto no encontrado');
      }

      const storedTranscript = await this.storage.getJson<Omit<Transcript, 'model'> & { model?: string }>(
        `transcripts/${jobId}/transcript.json`,
      );
      const transcript: Transcript = {
        ...storedTranscript,
        model: storedTranscript.model ?? 'stored-transcript',
      };

      await mkdir(dir, { recursive: true });
      await this.storage.downloadToFile(manifest.sourceKey, sourcePath);
      const sourceMeta = await this.media.probe(sourcePath);
      if (!sourceMeta.width || !sourceMeta.height || !sourceMeta.hasAudio) {
        throw new Error('El source del proyecto no es válido para actualizar');
      }

      let updatedCount = 0;
      const clipsToUpdate = clipIndices?.length
        ? manifest.clips.filter((clip) => clipIndices.includes(clip.index))
        : manifest.clips;
      for (const original of clipsToUpdate) {
        const subtitlesPath = path.join(dir, `captions-${original.index}.ass`);
        const outputPath = path.join(dir, `output-${original.index}.mp4`);

        const candidate: ClipCandidate = {
          startSeconds: original.startSeconds,
          endSeconds: original.endSeconds,
          title: replaceText(original.title),
          hook: replaceText(original.hook ?? original.title),
          reason: replaceText(original.reason),
          socialCaption: replaceText(original.socialCaption ?? original.reason),
          hashtags: original.hashtags?.length ? original.hashtags : ['#HydraReel'],
          emphasisTerms: (original.emphasisTerms ?? []).map(replaceText),
          score: original.score,
        };

        const captionStyle = original.captionStyle ?? 'pulse';
        const framing = sourceMeta.width / sourceMeta.height > 0.82 ? 'subject-safe' as const : 'fill' as const;
        const plan = this.rendering.createPlan(transcript, candidate);
        const captionCueCount = await this.rendering.writeSubtitles(
          subtitlesPath,
          transcript,
          candidate,
          { hook: candidate.hook, captionStyle, plan },
        );
        await this.rendering.render(sourcePath, outputPath, subtitlesPath, candidate, {
          sourceWidth: sourceMeta.width,
          sourceHeight: sourceMeta.height,
          hook: candidate.hook,
          captionStyle,
          plan,
        });

        const outputMeta = await this.media.probe(outputPath);
        const key = `outputs/${jobId}/clip-${String(original.index).padStart(2, '0')}-t${Date.now()}.mp4`;
        await this.storage.uploadFile(key, outputPath, 'video/mp4');

        const updated: JobClip = {
          ...original,
          key,
          generatedAt: new Date().toISOString(),
          title: candidate.title,
          hook: candidate.hook,
          socialCaption: candidate.socialCaption,
          reason: candidate.reason,
          emphasisTerms: candidate.emphasisTerms,
          magicEdit: {
            silenceCuts: plan.silenceCuts,
            removedSeconds: plan.removedSeconds,
            punchIns: plan.punchIns.length,
            audioPolished: plan.audioPolished,
            colorPolished: plan.colorPolished,
          },
          captionStyle,
          captionPolicy: plan.composition?.captionPolicy,
          platform: plan.composition?.platform ?? 'tiktok',
          preflight: plan.composition ? buildLayoutPreflight(plan.composition) : undefined,
          framing,
          durationSeconds: outputMeta.durationSeconds,
          captionCueCount,
          video: {
            width: outputMeta.width,
            height: outputMeta.height,
            codec: outputMeta.videoCodec,
            audioCodec: outputMeta.audioCodec,
          },
        };

        manifest.clips = manifest.clips.map((clip) => clip.index === original.index ? updated : clip);
        const transcriptMetrics = normalizeProjectMetrics(manifest.metrics);
        transcriptMetrics.clipsUpdatedFromTranscript += 1;
        manifest.metrics = transcriptMetrics;
        await this.storage.putJson(manifestKey, manifest);

        const job = await this.jobs.get(jobId);
        if (job && job.clientId === clientId) {
          job.clips = job.clips.map((clip) => clip.index === original.index ? updated : clip);
          await this.jobs.save(job);
        }

        if (original.key !== key) {
          await this.storage.deleteKeys([original.key]).catch(() => undefined);
        }
        updatedCount += 1;
      }

      return updatedCount;
    } finally {
      releaseRender();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

}

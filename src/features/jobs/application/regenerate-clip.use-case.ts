import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

type RegenerateMode = 'shorter' | 'longer' | 'alternative' | 'restyle';

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

function assertMode(value: unknown): RegenerateMode {
  if (value === 'shorter' || value === 'longer' || value === 'alternative' || value === 'restyle') return value;
  throw new BadRequestException('mode inválido');
}

function nextStyle(current: CaptionStyle): CaptionStyle {
  if (current === 'pulse') return 'clean';
  if (current === 'clean') return 'neon';
  return 'pulse';
}

@Injectable()
export class RegenerateClipUseCase {
  private busy = false;

  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(MEDIA_PORT) private readonly media: MediaPort,
    @Inject(CLIP_BRAIN_PORT) private readonly clipBrain: ClipBrainPort,
    @Inject(RENDERING_PORT) private readonly rendering: RenderingPort,
    private readonly renderGate: RenderGate,
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
    if (this.busy) throw new ConflictException('Hydra ya está ajustando otro clip.');
    const releaseRender = this.renderGate.tryAcquire(`regenerate:${jobId}:${clipIndex}`);
    if (!releaseRender) {
      throw new ConflictException('Hydra está terminando otra edición. Este ajuste estará disponible apenas termine.');
    }
    this.busy = true;

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
      await this.storage.putJson(manifestKey, manifest);
      if (original.key !== key) await this.storage.deleteKeys([original.key]).catch(() => undefined);

      return {
        ...updated,
        url: await this.storage.createDownloadUrl(updated.key),
      };
    } finally {
      this.busy = false;
      releaseRender();
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

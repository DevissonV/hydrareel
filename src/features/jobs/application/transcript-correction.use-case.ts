import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';
import { JOB_REPOSITORY, JobRepository } from './job.repository';
import { Transcript, TranscriptSegment, TranscriptWord } from '../../transcription/domain/transcript';
import { RegenerateClipUseCase } from './regenerate-clip.use-case';

interface StoredTranscript extends Omit<Transcript, 'model' | 'usage'> {
  jobId?: string;
  model?: string;
  correctedAt?: string;
  correctionCount?: number;
}

function assertUuid(value: string | undefined, name: string): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException(`${name} inválido`);
  }
  return value;
}

function assertClipIndex(value: string): number {
  const index = Number.parseInt(value, 10);
  if (!Number.isInteger(index) || index < 1) throw new BadRequestException('clipIndex inválido');
  return index;
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü$%]+/gi, '');
}

function tokens(text: string): string[] {
  return text.trim().match(/\S+/g) ?? [];
}

function retimeWords(
  original: TranscriptWord[],
  correctedText: string,
  duration: number,
  minStart = 0,
): TranscriptWord[] {
  const corrected = tokens(correctedText);
  if (!corrected.length) throw new BadRequestException('La transcripción no puede quedar vacía');
  if (!original.length) {
    const span = Math.max(0.1, duration - minStart);
    const slice = span / corrected.length;
    return corrected.map((word, index) => ({
      word,
      start: minStart + index * slice,
      end: minStart + (index + 1) * slice,
    }));
  }

  const result: TranscriptWord[] = [];
  let i = 0;
  let j = 0;
  const lookAhead = 6;

  const addInserted = (word: string, nextStart: number) => {
    const previousEnd = result.at(-1)?.end ?? minStart;
    const available = Math.max(0.04, nextStart - previousEnd);
    const start = previousEnd;
    const end = Math.min(nextStart, start + Math.max(0.04, Math.min(0.22, available)));
    result.push({ word, start, end: Math.max(start + 0.01, end) });
  };

  while (i < original.length && j < corrected.length) {
    if (normalizeToken(original[i].word) === normalizeToken(corrected[j])) {
      result.push({ ...original[i], word: corrected[j] });
      i += 1;
      j += 1;
      continue;
    }

    let correctedAhead = -1;
    for (let k = 1; k <= lookAhead && j + k < corrected.length; k += 1) {
      if (normalizeToken(corrected[j + k]) === normalizeToken(original[i].word)) {
        correctedAhead = k;
        break;
      }
    }

    let originalAhead = -1;
    for (let k = 1; k <= lookAhead && i + k < original.length; k += 1) {
      if (normalizeToken(original[i + k].word) === normalizeToken(corrected[j])) {
        originalAhead = k;
        break;
      }
    }

    if (correctedAhead > 0 && (originalAhead < 0 || correctedAhead <= originalAhead)) {
      for (let k = 0; k < correctedAhead; k += 1) {
        addInserted(corrected[j + k], original[i].start);
      }
      j += correctedAhead;
      continue;
    }

    if (originalAhead > 0) {
      i += originalAhead;
      continue;
    }

    result.push({ ...original[i], word: corrected[j] });
    i += 1;
    j += 1;
  }

  while (j < corrected.length) {
    const previousEnd = result.at(-1)?.end ?? original.at(-1)?.end ?? minStart;
    const start = Math.min(duration, previousEnd);
    const end = Math.min(duration, start + 0.14);
    result.push({ word: corrected[j], start, end: Math.max(start + 0.01, end) });
    j += 1;
  }

  return result.filter((word) => word.end > word.start);
}

function rebuildSegments(segments: TranscriptSegment[], words: TranscriptWord[]): TranscriptSegment[] {
  return segments.map((segment) => {
    const text = words
      .filter((word) => {
        const midpoint = (word.start + word.end) / 2;
        return midpoint >= segment.start && midpoint <= segment.end;
      })
      .map((word) => word.word)
      .join(' ')
      .trim();
    return { ...segment, text: text || segment.text };
  });
}

@Injectable()
export class TranscriptCorrectionUseCase {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(JOB_REPOSITORY) private readonly jobs: JobRepository,
    private readonly regenerate: RegenerateClipUseCase,
  ) {}

  private async ownedJob(rawClientId: string | undefined, rawJobId: string) {
    const clientId = assertUuid(rawClientId, 'clientId');
    const jobId = assertUuid(rawJobId, 'jobId');
    const job = await this.jobs.get(jobId);
    if (!job || job.clientId !== clientId) throw new NotFoundException('Proyecto no encontrado');
    return job;
  }

  async get(rawClientId: string | undefined, rawJobId: string) {
    const job = await this.ownedJob(rawClientId, rawJobId);
    try {
      const transcript = await this.storage.getJson<StoredTranscript>(`transcripts/${job.id}/transcript.json`);
      return {
        jobId: job.id,
        text: transcript.text,
        correctedAt: transcript.correctedAt,
        correctionCount: transcript.correctionCount ?? 0,
      };
    } catch {
      throw new NotFoundException('La transcripción todavía no está disponible');
    }
  }

  async getClip(
    rawClientId: string | undefined,
    rawJobId: string,
    rawClipIndex: string,
  ) {
    const job = await this.ownedJob(rawClientId, rawJobId);
    const clipIndex = assertClipIndex(rawClipIndex);
    const clip = job.clips.find((item) => item.index === clipIndex);
    if (!clip) throw new NotFoundException('Clip no encontrado');

    try {
      const transcript = await this.storage.getJson<StoredTranscript>(`transcripts/${job.id}/transcript.json`);
      const words = (transcript.words ?? []).filter(
        (word) => word.end > clip.startSeconds && word.start < clip.endSeconds,
      );
      return {
        jobId: job.id,
        clipIndex,
        text: words.map((word) => word.word).join(' ').trim(),
        correctedAt: transcript.correctedAt,
        correctionCount: transcript.correctionCount ?? 0,
      };
    } catch {
      throw new NotFoundException('La transcripción todavía no está disponible');
    }
  }

  async updateClip(
    rawClientId: string | undefined,
    rawJobId: string,
    rawClipIndex: string,
    rawText: unknown,
  ) {
    const job = await this.ownedJob(rawClientId, rawJobId);
    const clipIndex = assertClipIndex(rawClipIndex);
    const clip = job.clips.find((item) => item.index === clipIndex);
    if (!clip) throw new NotFoundException('Clip no encontrado');
    if (typeof rawText !== 'string') throw new BadRequestException('Texto inválido');

    const text = rawText.trim();
    if (!text) throw new BadRequestException('La transcripción no puede quedar vacía');
    if (text.length > 20_000) throw new BadRequestException('La transcripción del clip es demasiado larga');

    const key = `transcripts/${job.id}/transcript.json`;
    let transcript: StoredTranscript;
    try {
      transcript = await this.storage.getJson<StoredTranscript>(key);
    } catch {
      throw new NotFoundException('La transcripción todavía no está disponible');
    }

    const originalClipWords = (transcript.words ?? []).filter(
      (word) => word.end > clip.startSeconds && word.start < clip.endSeconds,
    );
    const currentText = originalClipWords.map((word) => word.word).join(' ').trim();
    if (text === currentText) {
      return {
        jobId: job.id,
        clipIndex,
        text,
        correctedAt: transcript.correctedAt,
        correctionCount: transcript.correctionCount ?? 0,
        updatingVideo: false,
      };
    }

    const correctedClipWords = retimeWords(
      originalClipWords,
      text,
      clip.endSeconds,
      clip.startSeconds,
    );

    const replacements: Array<{ from: string; to: string }> = [];
    for (const corrected of correctedClipWords) {
      const original = originalClipWords.find(
        (word) => Math.abs(word.start - corrected.start) < 0.001 && Math.abs(word.end - corrected.end) < 0.001,
      );
      if (original && normalizeToken(original.word) !== normalizeToken(corrected.word)) {
        replacements.push({ from: original.word, to: corrected.word });
      }
    }

    const before = (transcript.words ?? []).filter((word) => word.end <= clip.startSeconds);
    const after = (transcript.words ?? []).filter((word) => word.start >= clip.endSeconds);
    const correctedWords = [...before, ...correctedClipWords, ...after]
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const correctedAt = new Date().toISOString();

    const updated: StoredTranscript = {
      ...transcript,
      text: correctedWords.map((word) => word.word).join(' ').trim(),
      words: correctedWords,
      segments: rebuildSegments(transcript.segments ?? [], correctedWords),
      correctedAt,
      correctionCount: (transcript.correctionCount ?? 0) + 1,
    };
    await this.storage.putJson(key, updated);

    setImmediate(() => {
      void this.regenerate
        .refreshFromCorrectedTranscript(job.clientId, job.id, replacements, [clipIndex])
        .catch(() => undefined);
    });

    return {
      jobId: job.id,
      clipIndex,
      text,
      correctedAt,
      correctionCount: updated.correctionCount,
      updatingVideo: true,
    };
  }

  async update(rawClientId: string | undefined, rawJobId: string, rawText: unknown) {
    const job = await this.ownedJob(rawClientId, rawJobId);
    if (typeof rawText !== 'string') throw new BadRequestException('Texto inválido');
    const text = rawText.trim();
    if (!text) throw new BadRequestException('La transcripción no puede quedar vacía');
    if (text.length > 120_000) throw new BadRequestException('La transcripción es demasiado larga');

    const key = `transcripts/${job.id}/transcript.json`;
    let transcript: StoredTranscript;
    try {
      transcript = await this.storage.getJson<StoredTranscript>(key);
    } catch {
      throw new NotFoundException('La transcripción todavía no está disponible');
    }

    if (text === transcript.text.trim()) {
      return { jobId: job.id, text, correctedAt: transcript.correctedAt, correctionCount: transcript.correctionCount ?? 0 };
    }

    const correctedWords = retimeWords(transcript.words ?? [], text, transcript.duration);
    const replacements: Array<{ from: string; to: string }> = [];
    for (const corrected of correctedWords) {
      const original = (transcript.words ?? []).find(
        (word) => Math.abs(word.start - corrected.start) < 0.001 && Math.abs(word.end - corrected.end) < 0.001,
      );
      if (original && normalizeToken(original.word) !== normalizeToken(corrected.word)) {
        replacements.push({ from: original.word, to: corrected.word });
      }
    }
    const correctedAt = new Date().toISOString();
    const updated: StoredTranscript = {
      ...transcript,
      text,
      words: correctedWords,
      segments: rebuildSegments(transcript.segments ?? [], correctedWords),
      correctedAt,
      correctionCount: (transcript.correctionCount ?? 0) + 1,
    };
    await this.storage.putJson(key, updated);

    const clipsUpdating = job.clips.length;
    setImmediate(() => {
      void this.regenerate
        .refreshFromCorrectedTranscript(job.clientId, job.id, replacements)
        .catch(() => undefined);
    });

    return {
      jobId: job.id,
      text,
      correctedAt,
      correctionCount: updated.correctionCount,
      clipsUpdating,
      updatingVideos: clipsUpdating > 0,
    };
  }
}

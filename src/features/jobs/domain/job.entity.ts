import { assertTransition, JobStatus, isTerminal } from './job-status';
import { LayoutPreflightReport } from '../../rendering/domain/composition';

export interface JobClip {
  index: number;
  key: string;
  generatedAt?: string;
  title: string;
  hook: string;
  socialCaption: string;
  hashtags: string[];
  emphasisTerms: string[];
  magicEdit: {
    silenceCuts: number;
    removedSeconds: number;
    punchIns: number;
    audioPolished: boolean;
    colorPolished: boolean;
  };
  captionStyle: 'pulse' | 'clean' | 'neon';
  captionPolicy?: 'FULL' | 'REDUCED' | 'KEY_MOMENTS' | 'HOOK_ONLY' | 'NONE';
  platform?: 'tiktok' | 'reels' | 'shorts';
  preflight?: LayoutPreflightReport;
  framing: 'fill' | 'subject-safe';
  durationSeconds: number;
  score: number;
  reason: string;
  startSeconds: number;
  endSeconds: number;
  captionCueCount: number;
  video: { width: number; height: number; codec: string; audioCodec: string };
}

export interface JobTimings {
  transcriptionDurationMs?: number;
  analysisDurationMs?: number;
  renderDurationMs?: number;
  totalDurationMs?: number;
}

export interface JobUsage {
  transcription?: unknown;
  analysis?: unknown;
}

export interface JobSnapshot {
  id: string;
  originalFileName: string;
  sourceKey: string;
  contentType: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  sourceDuration?: number;
  failureStage?: string;
  error?: string;
  clips: JobClip[];
  timings: JobTimings;
  usage: JobUsage;
}

export class Job {
  readonly createdAt: Date;
  updatedAt: Date;
  status: JobStatus = 'UPLOADING';
  sourceDuration?: number;
  failureStage?: string;
  error?: string;
  clips: JobClip[] = [];
  timings: JobTimings = {};
  usage: JobUsage = {};

  constructor(
    readonly id: string,
    readonly originalFileName: string,
    readonly sourceKey: string,
    readonly contentType: string,
    readonly clientId: string,
    createdAt = new Date(),
  ) {
    this.createdAt = createdAt;
    this.updatedAt = new Date(createdAt);
  }

  transition(next: JobStatus): void {
    assertTransition(this.status, next);
    this.status = next;
    this.updatedAt = new Date();
  }

  fail(stage: string, message: string): void {
    if (!isTerminal(this.status)) this.transition('FAILED');
    this.failureStage = stage;
    this.error = message;
    this.updatedAt = new Date();
  }

  recoverForRetry(): void {
    this.status = 'UPLOADED';
    this.failureStage = undefined;
    this.error = undefined;
    this.clips = [];
    this.updatedAt = new Date();
  }

  toSnapshot(): JobSnapshot {
    return {
      id: this.id,
      originalFileName: this.originalFileName,
      sourceKey: this.sourceKey,
      contentType: this.contentType,
      clientId: this.clientId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      status: this.status,
      sourceDuration: this.sourceDuration,
      failureStage: this.failureStage,
      error: this.error,
      clips: this.clips,
      timings: this.timings,
      usage: this.usage,
    };
  }

  static restore(snapshot: JobSnapshot): Job {
    const job = new Job(
      snapshot.id,
      snapshot.originalFileName,
      snapshot.sourceKey,
      snapshot.contentType,
      snapshot.clientId,
      new Date(snapshot.createdAt),
    );
    job.updatedAt = new Date(snapshot.updatedAt);
    job.status = snapshot.status;
    job.sourceDuration = snapshot.sourceDuration;
    job.failureStage = snapshot.failureStage;
    job.error = snapshot.error;
    job.clips = snapshot.clips ?? [];
    job.timings = snapshot.timings ?? {};
    job.usage = snapshot.usage ?? {};
    return job;
  }
}

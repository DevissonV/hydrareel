import { assertTransition, JobStatus, isTerminal } from './job-status';

export interface JobClip {
  index: number;
  key: string;
  title: string;
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

export class Job {
  readonly createdAt = new Date();
  updatedAt = new Date();
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
  ) {}

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
}

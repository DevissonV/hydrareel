export const JOB_STATUSES = [
  'UPLOADING',
  'UPLOADED',
  'TRANSCRIBING',
  'ANALYZING',
  'RENDERING',
  'COMPLETED',
  'NO_CLIPS',
  'FAILED',
  'CANCELLED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

const allowed: Record<JobStatus, JobStatus[]> = {
  UPLOADING: ['UPLOADED', 'FAILED', 'CANCELLED'],
  UPLOADED: ['TRANSCRIBING', 'FAILED', 'CANCELLED'],
  TRANSCRIBING: ['ANALYZING', 'FAILED', 'CANCELLED'],
  ANALYZING: ['RENDERING', 'NO_CLIPS', 'FAILED', 'CANCELLED'],
  RENDERING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  NO_CLIPS: [],
  FAILED: [],
  CANCELLED: [],
};

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!allowed[from].includes(to)) throw new Error(`Invalid job transition ${from} -> ${to}`);
}

export function isTerminal(status: JobStatus): boolean {
  return status === 'COMPLETED' || status === 'NO_CLIPS' || status === 'FAILED' || status === 'CANCELLED';
}

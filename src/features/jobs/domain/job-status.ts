export const JOB_STATUSES = [
  'UPLOADING',
  'UPLOADED',
  'TRANSCRIBING',
  'ANALYZING',
  'RENDERING',
  'COMPLETED',
  'FAILED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

const allowed: Record<JobStatus, JobStatus[]> = {
  UPLOADING: ['UPLOADED', 'FAILED'],
  UPLOADED: ['TRANSCRIBING', 'FAILED'],
  TRANSCRIBING: ['ANALYZING', 'FAILED'],
  ANALYZING: ['RENDERING', 'FAILED'],
  RENDERING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!allowed[from].includes(to)) throw new Error(`Invalid job transition ${from} -> ${to}`);
}

export function isTerminal(status: JobStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}

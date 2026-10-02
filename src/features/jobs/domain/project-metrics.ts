export type RegenerationMetricMode = 'shorter' | 'longer' | 'alternative' | 'restyle';

export interface ProjectMetrics {
  initialClipsGenerated: number;
  initialOutputDurationSeconds: number;
  initialProcessingDurationMs: number;
  transcriptCorrectionSaves: number;
  transcriptWordsCorrected: number;
  clipsUpdatedFromTranscript: number;
  regenerationRequests: Record<RegenerationMetricMode, number>;
  regenerationSucceeded: number;
  regenerationFailed: number;
  regenerationDurationMs: number;
}

export function emptyProjectMetrics(): ProjectMetrics {
  return {
    initialClipsGenerated: 0,
    initialOutputDurationSeconds: 0,
    initialProcessingDurationMs: 0,
    transcriptCorrectionSaves: 0,
    transcriptWordsCorrected: 0,
    clipsUpdatedFromTranscript: 0,
    regenerationRequests: {
      shorter: 0,
      longer: 0,
      alternative: 0,
      restyle: 0,
    },
    regenerationSucceeded: 0,
    regenerationFailed: 0,
    regenerationDurationMs: 0,
  };
}

export function normalizeProjectMetrics(value?: Partial<ProjectMetrics>): ProjectMetrics {
  const base = emptyProjectMetrics();
  return {
    ...base,
    ...value,
    regenerationRequests: {
      ...base.regenerationRequests,
      ...(value?.regenerationRequests ?? {}),
    },
  };
}

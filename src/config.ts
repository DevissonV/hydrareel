export type HydraConfig = ReturnType<typeof loadConfig>;

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${name}`);
  return value;
}

export function loadConfig() {
  return {
    port: intEnv('PORT', 3000),
    maxVideoMinutes: intEnv('MAX_VIDEO_MINUTES', 30),
    maxClipsPerJob: intEnv('MAX_CLIPS_PER_JOB', 10),
    minClipSeconds: intEnv('MIN_CLIP_SECONDS', 20),
    maxClipSeconds: intEnv('MAX_CLIP_SECONDS', 60),
    maxConcurrentJobs: intEnv('MAX_CONCURRENT_JOBS', 1),
    presignedUrlTtlSeconds: intEnv('PRESIGNED_URL_TTL_SECONDS', 14400),
    openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.OPENAI_COMPATIBLE_API_KEY ?? '',
    openaiBaseUrl: (process.env.OPENAI_BASE_URL ?? process.env.OPENAI_COMPATIBLE_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
    openaiTranscriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'whisper-1',
    openaiClipModel: process.env.OPENAI_CLIP_MODEL ?? process.env.OPENAI_COMPATIBLE_MODEL ?? 'gpt-6-luna',
    bucketEndpoint: process.env.BUCKET_ENDPOINT ?? '',
    bucketRegion: process.env.BUCKET_REGION ?? 'us-east-1',
    bucketName: process.env.BUCKET_NAME ?? '',
    bucketAccessKeyId: process.env.BUCKET_ACCESS_KEY_ID ?? '',
    bucketSecretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY ?? '',
  };
}

export const CONFIG = Symbol('HYDRA_CONFIG');

import { readFile } from 'node:fs/promises';
import { jobLog } from '../../../logger';

export function memoryPressure(usedBytes: number, limitBytes: number) {
  if (!Number.isFinite(limitBytes) || limitBytes <= 0 || !Number.isFinite(usedBytes)) return null;
  return {
    usedMB: Math.round(usedBytes / 1048576),
    limitMB: Math.round(limitBytes / 1048576),
    percent: Math.round(usedBytes / limitBytes * 100),
  };
}

/** Observe real container cgroup usage (Node RSS alone omits ffmpeg child processes). */
export async function reportMemoryPressure(jobId: string, stage: string): Promise<void> {
  try {
    const [used, max] = await Promise.all([
      readFile('/sys/fs/cgroup/memory.current', 'utf8'),
      readFile('/sys/fs/cgroup/memory.max', 'utf8'),
    ]);
    if (max.trim() === 'max') return;
    const stats = memoryPressure(Number(used.trim()), Number(max.trim()));
    if (stats && stats.percent >= 85) {
      jobLog(jobId, 'memory_pressure', { stage, ...stats });
    }
  } catch {
    // Monitoring must never affect user jobs or consume paid AI calls.
  }
}

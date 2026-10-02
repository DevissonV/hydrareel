export function jobLog(jobId: string, event: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), jobId, event, ...data }));
}

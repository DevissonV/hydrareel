const ALLOWED_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);
const ALLOWED_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'application/octet-stream']);

export function validateUploadInput(fileName: string, contentType: string): { extension: string } {
  const clean = fileName.trim();
  const extension = clean.includes('.') ? clean.split('.').pop()!.toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error('Formato no permitido. Usa MP4, MOV o WEBM.');
  if (contentType && !ALLOWED_TYPES.has(contentType.toLowerCase())) throw new Error('Tipo MIME no permitido.');
  return { extension };
}

export function validateMediaDuration(durationSeconds: number, maxVideoMinutes: number): void {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('Duración de video inválida');
  if (durationSeconds > maxVideoMinutes * 60) throw new Error(`El video supera el máximo de ${maxVideoMinutes} minutos`);
}

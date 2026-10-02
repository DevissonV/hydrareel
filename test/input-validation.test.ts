import { describe, expect, it } from 'vitest';
import { validateMediaDuration, validateUploadInput } from '../src/features/jobs/application/input-validation';

describe('input validation', () => {
  it('acepta formatos MVP', () => {
    expect(validateUploadInput('demo.MP4', 'video/mp4').extension).toBe('mp4');
    expect(validateUploadInput('demo.mov', 'video/quicktime').extension).toBe('mov');
    expect(validateUploadInput('demo.webm', 'video/webm').extension).toBe('webm');
  });
  it('rechaza formato no permitido', () => {
    expect(() => validateUploadInput('demo.avi', 'video/x-msvideo')).toThrow();
  });
  it('aplica el máximo de duración', () => {
    expect(() => validateMediaDuration(1800, 30)).not.toThrow();
    expect(() => validateMediaDuration(1800.01, 30)).toThrow();
  });
});

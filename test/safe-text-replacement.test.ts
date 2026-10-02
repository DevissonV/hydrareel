import { describe, expect, it } from 'vitest';
import { replaceWholeText } from '../src/features/jobs/application/regenerate-clip.use-case';

describe('safe transcript replacement', () => {
  it('reemplaza solo palabras completas y no corrompe otras palabras', () => {
    const input = 'No es solo un corte: también hay estrés y antes del turno.';
    const output = replaceWholeText(input, 'es', 'estoy');
    expect(output).toBe('No estoy solo un corte: también hay estrés y antes del turno.');
  });

  it('reemplaza frases completas sin tocar coincidencias internas', () => {
    const input = 'Hablamos con lentes y con clientes potenciales.';
    const output = replaceWholeText(input, 'lentes', 'clientes');
    expect(output).toBe('Hablamos con clientes y con clientes potenciales.');
  });
});

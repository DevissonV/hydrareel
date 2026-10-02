# HydraReel

HydraReel MVP-001 toma un video largo subido por el usuario, lo valida con ffprobe, lo transcribe con OpenAI, selecciona hasta tres momentos mediante IA y renderiza tres clips verticales 9:16 con subtítulos quemados usando FFmpeg.

## Requisitos

- Node.js 22+
- FFmpeg + ffprobe
- Bucket S3 compatible (Railway Storage Bucket)
- OpenAI API key

## Variables ENV

Copia `.env.example`. Variables principales: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_CLIP_MODEL`, `BUCKET_ENDPOINT`, `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_ACCESS_KEY_ID`, `BUCKET_SECRET_ACCESS_KEY`, `MAX_VIDEO_MINUTES`, `MAX_CLIPS_PER_JOB`, `MIN_CLIP_SECONDS`, `MAX_CLIP_SECONDS`, `MAX_CONCURRENT_JOBS`.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Tests

```bash
npm test
npm run build
npm run validate
```

## Smoke real

Usa un video propio/legal con voz:

```bash
SMOKE_SOURCE=/ruta/video.mp4 HYDRAREEL_BASE_URL=http://localhost:3000 npm run smoke:real
```

Opcionalmente genera una fuente reproducible si tienes `espeak-ng` y FFmpeg:

```bash
npm run smoke:generate
npm run smoke:real
```

El smoke no usa mocks y solo imprime `HYDRAREEL_MVP_E2E: PASS` después de subir a S3, transcribir con OpenAI, seleccionar clips, renderizar, descargar y verificar tres MP4 1080x1920 H.264/AAC con cues de subtítulos.

## Deployment Railway

El repo incluye `Dockerfile` con FFmpeg y `railway.toml`. Configura las ENV del bucket y OpenAI, despliega la rama `release` y usa `GET /api/health` como healthcheck. Los videos durables se guardan en el bucket; `/tmp` se usa solo durante el procesamiento y se elimina al finalizar.

> Procesa únicamente contenido propio o que tengas derecho a utilizar.

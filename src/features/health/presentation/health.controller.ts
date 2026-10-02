import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { CONFIG, HydraConfig } from '../../../config';
import { MEDIA_PORT, MediaPort } from '../../media/application/media.port';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../storage/application/object-storage.port';

@Controller('api/health')
export class HealthController {
  constructor(
    @Inject(CONFIG) private readonly config: HydraConfig,
    @Inject(MEDIA_PORT) private readonly media: MediaPort,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
  ) {}

  @Get()
  async get() {
    const [ffmpeg, storage] = await Promise.all([this.media.isAvailable(), this.storage.health()]);
    const openaiConfigured = Boolean(this.config.openaiApiKey);
    const body = {
      status: ffmpeg && storage && openaiConfigured ? 'ok' : 'degraded',
      ffmpeg,
      storage,
      openaiConfigured,
    };
    if (body.status !== 'ok') throw new ServiceUnavailableException(body);
    return body;
  }
}

import { Controller, Get, Inject } from '@nestjs/common';
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
    return {
      status: 'ok',
      ffmpeg,
      storage,
      openaiConfigured: Boolean(this.config.openaiApiKey),
    };
  }
}

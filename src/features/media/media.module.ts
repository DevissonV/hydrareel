import { Module } from '@nestjs/common';
import { MEDIA_PORT } from './application/media.port';
import { FfmpegMediaAdapter } from './infrastructure/ffmpeg-media.adapter';

@Module({
  providers: [FfmpegMediaAdapter, { provide: MEDIA_PORT, useExisting: FfmpegMediaAdapter }],
  exports: [MEDIA_PORT],
})
export class MediaModule {}

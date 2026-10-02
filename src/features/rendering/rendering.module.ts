import { Module } from '@nestjs/common';
import { RENDERING_PORT } from './application/rendering.port';
import { FfmpegRenderingAdapter } from './infrastructure/ffmpeg-rendering.adapter';

@Module({
  providers: [FfmpegRenderingAdapter, { provide: RENDERING_PORT, useExisting: FfmpegRenderingAdapter }],
  exports: [RENDERING_PORT],
})
export class RenderingModule {}

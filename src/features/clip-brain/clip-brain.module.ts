import { Module } from '@nestjs/common';
import { CLIP_BRAIN_PORT } from './application/clip-brain.port';
import { OpenAiClipBrainAdapter } from './infrastructure/openai-clip-brain.adapter';

@Module({
  providers: [OpenAiClipBrainAdapter, { provide: CLIP_BRAIN_PORT, useExisting: OpenAiClipBrainAdapter }],
  exports: [CLIP_BRAIN_PORT],
})
export class ClipBrainModule {}

import { Module } from '@nestjs/common';
import { TRANSCRIPTION_PORT } from './application/transcription.port';
import { OpenAiTranscriptionAdapter } from './infrastructure/openai-transcription.adapter';

@Module({
  providers: [OpenAiTranscriptionAdapter, { provide: TRANSCRIPTION_PORT, useExisting: OpenAiTranscriptionAdapter }],
  exports: [TRANSCRIPTION_PORT],
})
export class TranscriptionModule {}

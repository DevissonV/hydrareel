import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { MediaModule } from '../media/media.module';
import { TranscriptionModule } from '../transcription/transcription.module';
import { ClipBrainModule } from '../clip-brain/clip-brain.module';
import { RenderingModule } from '../rendering/rendering.module';
import { JOB_REPOSITORY, DurableJobRepository } from './application/job.repository';
import { CreateUploadUseCase } from './application/create-upload.use-case';
import { ProcessJobUseCase } from './application/process-job.use-case';
import { GetJobUseCase } from './application/get-job.use-case';
import { JobsController } from './presentation/jobs.controller';
import { LibraryController } from './presentation/library.controller';
import { LibraryUseCase } from './application/library.use-case';
import { RegenerateClipUseCase } from './application/regenerate-clip.use-case';
import { RenderGate } from './application/render-gate';
import { TranscriptCorrectionUseCase } from './application/transcript-correction.use-case';
import { HeavyWorkQueue } from './application/heavy-work-queue';

@Module({
  imports: [StorageModule, MediaModule, TranscriptionModule, ClipBrainModule, RenderingModule],
  controllers: [JobsController, LibraryController],
  providers: [
    DurableJobRepository,
    { provide: JOB_REPOSITORY, useExisting: DurableJobRepository },
    CreateUploadUseCase,
    ProcessJobUseCase,
    GetJobUseCase,
    LibraryUseCase,
    RegenerateClipUseCase,
    RenderGate,
    TranscriptCorrectionUseCase,
    HeavyWorkQueue,
  ],
})
export class JobsModule {}

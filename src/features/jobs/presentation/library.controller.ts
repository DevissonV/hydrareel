import { Body, Controller, Delete, Get, Headers, Param, Post, Put } from '@nestjs/common';
import { LibraryUseCase } from '../application/library.use-case';
import { RegenerateClipUseCase } from '../application/regenerate-clip.use-case';
import { TranscriptCorrectionUseCase } from '../application/transcript-correction.use-case';

@Controller('api/library')
export class LibraryController {
  constructor(
    private readonly library: LibraryUseCase,
    private readonly regenerate: RegenerateClipUseCase,
    private readonly transcriptCorrection: TranscriptCorrectionUseCase,
  ) {}

  @Get()
  list(@Headers('x-hydra-client-id') clientId?: string) {
    return this.library.list(clientId);
  }

  @Get(':jobId/transcript')
  transcript(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return this.transcriptCorrection.get(clientId, jobId);
  }

  @Put(':jobId/transcript')
  updateTranscript(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
    @Body() body: { text?: unknown },
  ) {
    return this.transcriptCorrection.update(clientId, jobId, body.text);
  }

  @Post(':jobId/clips/:clipIndex/regenerate')
  regenerateClip(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
    @Param('clipIndex') clipIndex: string,
    @Body() body: { mode?: unknown; captionStyle?: unknown },
  ) {
    return this.regenerate.execute(clientId, jobId, clipIndex, body);
  }

  @Delete(':jobId')
  remove(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return this.library.delete(clientId, jobId);
  }
}

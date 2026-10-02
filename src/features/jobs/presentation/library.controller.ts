import { Body, Controller, Delete, Get, Headers, Param, Post, Put, StreamableFile } from '@nestjs/common';
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

  @Get('metrics')
  metrics(@Headers('x-hydra-client-id') clientId?: string) {
    return this.library.metrics(clientId);
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

  @Get(':jobId/clips/:clipIndex/file')
  async clipFile(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
    @Param('clipIndex') clipIndex: string,
  ) {
    const file = await this.library.file(clientId, jobId, clipIndex);
    return new StreamableFile(file.stream, {
      type: 'video/mp4',
      disposition: `inline; filename="${file.fileName}"`,
    });
  }

  @Get(':jobId/clips/:clipIndex/download')
  downloadClip(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
    @Param('clipIndex') clipIndex: string,
  ) {
    return this.library.download(clientId, jobId, clipIndex);
  }

  @Get(':jobId/clips/:clipIndex/transcript')
  clipTranscript(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
    @Param('clipIndex') clipIndex: string,
  ) {
    return this.transcriptCorrection.getClip(clientId, jobId, clipIndex);
  }

  @Put(':jobId/clips/:clipIndex/transcript')
  updateClipTranscript(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
    @Param('clipIndex') clipIndex: string,
    @Body() body: { text?: unknown },
  ) {
    return this.transcriptCorrection.updateClip(clientId, jobId, clipIndex, body.text);
  }

  @Post(':jobId/clips/:clipIndex/regenerate')
  regenerateClip(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
    @Param('clipIndex') clipIndex: string,
    @Body() body: { mode?: unknown; captionStyle?: unknown },
  ) {
    const task = this.regenerate.execute(clientId, jobId, clipIndex, body);
    void task.catch(() => undefined);
    return { accepted: true, clipIndex: Number.parseInt(clipIndex, 10) };
  }

  @Delete(':jobId')
  remove(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return this.library.delete(clientId, jobId);
  }
}

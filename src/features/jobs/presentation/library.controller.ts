import { Body, Controller, Delete, Get, Headers, Param, Post } from '@nestjs/common';
import { LibraryUseCase } from '../application/library.use-case';
import { RegenerateClipUseCase } from '../application/regenerate-clip.use-case';

@Controller('api/library')
export class LibraryController {
  constructor(
    private readonly library: LibraryUseCase,
    private readonly regenerate: RegenerateClipUseCase,
  ) {}

  @Get()
  list(@Headers('x-hydra-client-id') clientId?: string) {
    return this.library.list(clientId);
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

import { Controller, Delete, Get, Headers, Param } from '@nestjs/common';
import { LibraryUseCase } from '../application/library.use-case';

@Controller('api/library')
export class LibraryController {
  constructor(private readonly library: LibraryUseCase) {}

  @Get()
  list(@Headers('x-hydra-client-id') clientId?: string) {
    return this.library.list(clientId);
  }

  @Delete(':jobId')
  remove(
    @Headers('x-hydra-client-id') clientId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    return this.library.delete(clientId, jobId);
  }
}

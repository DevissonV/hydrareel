import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { CreateUploadUseCase } from '../application/create-upload.use-case';
import { ProcessJobUseCase } from '../application/process-job.use-case';
import { GetJobUseCase } from '../application/get-job.use-case';
import { UploadSessionUseCase } from '../application/upload-session.use-case';

@Controller('api/jobs')
export class JobsController {
  constructor(
    private readonly createUpload: CreateUploadUseCase,
    private readonly processJob: ProcessJobUseCase,
    private readonly getJob: GetJobUseCase,
    private readonly uploads: UploadSessionUseCase,
  ) {}

  @Post('upload-url')
  create(@Body() body: { fileName?: string; contentType?: string; clientId?: string; sizeBytes?: number }) {
    if (!body.fileName) throw new Error('fileName es requerido');
    return this.createUpload.execute(body.fileName, body.contentType ?? 'application/octet-stream', body.clientId, body.sizeBytes);
  }

  @Get(':id/upload-status')
  uploadStatus(@Param('id') id: string, @Headers('x-hydra-client-id') clientId?: string) {
    return this.uploads.status(id, clientId);
  }

  @Post(':id/part-url')
  partUrl(@Param('id') id: string, @Headers('x-hydra-client-id') clientId: string | undefined,
    @Body() body: { partNumber?: number }) {
    return this.uploads.partUrl(id, clientId, body.partNumber ?? NaN);
  }

  @Post(':id/complete-upload')
  completeUpload(@Param('id') id: string, @Headers('x-hydra-client-id') clientId?: string) {
    return this.uploads.complete(id, clientId);
  }

  @Post('queue-batch')
  queueBatch(@Headers('x-hydra-client-id') clientId: string | undefined,
    @Body() body: { jobIds?: string[] }) {
    return this.processJob.queueBatch(body.jobIds ?? [], clientId);
  }

  @Post(':id/uploaded')
  @HttpCode(202)
  async uploaded(@Param('id') id: string) {
    await this.processJob.markUploadedAndStart(id);
    return { accepted: true, jobId: id };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Headers('x-hydra-client-id') clientId: string | undefined,
  ) {
    return this.processJob.cancel(id, clientId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getJob.execute(id);
  }
}

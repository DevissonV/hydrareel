import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CreateUploadUseCase } from '../application/create-upload.use-case';
import { ProcessJobUseCase } from '../application/process-job.use-case';
import { GetJobUseCase } from '../application/get-job.use-case';

@Controller('api/jobs')
export class JobsController {
  constructor(
    private readonly createUpload: CreateUploadUseCase,
    private readonly processJob: ProcessJobUseCase,
    private readonly getJob: GetJobUseCase,
  ) {}

  @Post('upload-url')
  create(@Body() body: { fileName?: string; contentType?: string }) {
    if (!body.fileName) throw new Error('fileName es requerido');
    return this.createUpload.execute(body.fileName, body.contentType ?? 'application/octet-stream');
  }

  @Post(':id/uploaded')
  @HttpCode(202)
  async uploaded(@Param('id') id: string) {
    await this.processJob.markUploadedAndStart(id);
    return { accepted: true, jobId: id };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getJob.execute(id);
  }
}

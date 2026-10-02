import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { StorageModule } from '../storage/storage.module';
import { HealthController } from './presentation/health.controller';

@Module({ imports: [MediaModule, StorageModule], controllers: [HealthController] })
export class HealthModule {}

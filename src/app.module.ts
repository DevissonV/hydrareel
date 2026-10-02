import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';
import { JobsModule } from './features/jobs/jobs.module';
import { HealthModule } from './features/health/health.module';
import { WebModule } from './features/web/web.module';

@Module({ imports: [ConfigModule, JobsModule, HealthModule, WebModule] })
export class AppModule {}

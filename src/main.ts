import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.enableShutdownHooks();
  const config = loadConfig();
  await app.listen(config.port, '0.0.0.0');
  console.log(JSON.stringify({ event: 'hydrareel_started', port: config.port }));
}
void bootstrap();

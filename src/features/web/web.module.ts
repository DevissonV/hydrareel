import { Module } from '@nestjs/common';
import { WebController } from './presentation/web.controller';

@Module({ controllers: [WebController] })
export class WebModule {}

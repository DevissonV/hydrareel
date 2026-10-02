import { Module } from '@nestjs/common';
import { OBJECT_STORAGE } from './application/object-storage.port';
import { RailwayS3Adapter } from './infrastructure/railway-s3.adapter';

@Module({
  providers: [RailwayS3Adapter, { provide: OBJECT_STORAGE, useExisting: RailwayS3Adapter }],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}

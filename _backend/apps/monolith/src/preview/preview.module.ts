import { Module } from '@nestjs/common';
import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { ProfileModule } from '../profile/profile.module';
import { ReportModule } from '../report/report.module';
import { StorageModule } from '../storage/storage.module';

// Composes over the profile and report reads; no Prisma of its own.
@Module({
  imports: [ProfileModule, ReportModule, StorageModule],
  controllers: [PreviewController],
  providers: [PreviewService],
})
export class PreviewModule {}

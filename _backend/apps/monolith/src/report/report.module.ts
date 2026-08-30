import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportPdfService } from './report-pdf.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ReportController],
  providers: [ReportService, ReportPdfService],
  exports: [ReportService],
})
export class ReportModule {}

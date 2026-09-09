import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ComponentController } from './component.controller';
import { ComponentService } from './component.service';
import { ServiceTrackingModule } from '../service-tracking/service-tracking.module';

@Module({
  imports: [PrismaModule, ServiceTrackingModule],
  controllers: [ComponentController],
  providers: [ComponentService],
  exports: [ComponentService],
})
export class ComponentModuleModule {}

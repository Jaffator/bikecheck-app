import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ComponentController } from './component.controller';
import { ComponentRepository } from './component.repository';
import { ComponentService } from './component.service';

@Module({
  imports: [PrismaModule],
  controllers: [ComponentController],
  providers: [ComponentService, ComponentRepository],
  exports: [ComponentService, ComponentRepository],
})
export class ComponentModuleModule {}

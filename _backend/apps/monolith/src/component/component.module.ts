import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ComponentController } from './component.controller';
import { ComponentService } from './component.service';

@Module({
  imports: [PrismaModule],
  controllers: [ComponentController],
  providers: [ComponentService],
  exports: [ComponentService],
})
export class ComponentModuleModule {}

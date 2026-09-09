import { Module } from '@nestjs/common';
import { ProbeController } from './probe.controller';

// Throwaway module for #76, registered in AppModule on this branch only.
@Module({ controllers: [ProbeController] })
export class ProbeModule {}

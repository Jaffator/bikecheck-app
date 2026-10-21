import { Module } from '@nestjs/common';
import { BikePageController } from './bike-page.controller';
import { BikePageService } from './bike-page.service';

@Module({
  controllers: [BikePageController],
  providers: [BikePageService],
})
export class BikePageModule {}

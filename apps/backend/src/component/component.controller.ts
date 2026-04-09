import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { CreateMountedComponentsDto } from './dto/create-components';
import { ComponentService } from './component.service';

@Controller('component')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  // Get component form default - for manually fill components
  @Get('/form-options-news')
  @ApiResponse({ status: 200, type: CreateMountedComponentsDto })
  async getFormOptions() {
    return await this.componentService.getComponentsFormOptions();
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ComponentService } from './component.service';
import { ResponseComponentGroupDto, AssembleBikeComponentsDto, ResponseComponentsDto } from './dto/response-components';

@Controller('component')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  // Get component form default - for manually fill components
  @Get('/defaults-form')
  @ApiResponse({ status: 200, type: AssembleBikeComponentsDto, isArray: true })
  async getFormOptions() {
    return await this.componentService.getComponentsFormOptions();
  }

  // Get all bike component groups
  @Get('groups')
  @ApiResponse({ status: 200, type: ResponseComponentGroupDto, isArray: true })
  async getGroups(): Promise<ResponseComponentGroupDto[]> {
    return await this.componentService.getAllComponentGroups();
  }

  // Get mounted components for a bike
  @Get('mounted-components')
  @ApiResponse({ status: 200, type: ResponseComponentsDto, isArray: true })
  async getMountedComponents(@Query('bikeId') bikeId: string): Promise<ResponseComponentsDto[]> {
    return await this.componentService.getMountedComponents(bikeId);
  }
}

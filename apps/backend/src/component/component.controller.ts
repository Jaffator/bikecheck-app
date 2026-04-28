import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ComponentService } from './component.service';
import { ResponseComponentGroupDto, AssembleBikeComponentsDto, ResponseComponentsDto } from './dto/response-components';

@Controller('components')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  // ---------- POST Custom system Component with user id ----------
  @Post()
  @ApiResponse({ status: 201, type: ResponseComponentsDto })
  async createCustomComponent() {
    // Implementation for creating a custom component with user ID goes here
  }

  // ---------- GET component form default - for manually fill components ----------
  @Get('/defaults-form')
  @ApiResponse({ status: 200, type: AssembleBikeComponentsDto, isArray: true })
  async getFormOptions() {
    return await this.componentService.getComponentsFormOptions();
  }

  // ---------- GET all Groups ----------
  @Get('groups')
  @ApiResponse({ status: 200, type: ResponseComponentGroupDto, isArray: true })
  async getGroups(): Promise<ResponseComponentGroupDto[]> {
    return await this.componentService.getAllComponentGroups();
  }

  // ---------- GET Mounted Components based on bike ID ----------
  @Get('mounted-components')
  @ApiResponse({ status: 200, type: ResponseComponentsDto, isArray: true })
  async getMountedComponents(@Query('bikeId') bikeId: string): Promise<ResponseComponentsDto[]> {
    return await this.componentService.getMountedComponents(bikeId);
  }
  // ---------- GET mounted components for a bike ----------
  // Update endpoint for mounted components, and delete
  // Create, Update system with userid components
  //
}

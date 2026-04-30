import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ComponentService } from './component.service';
import {
  Response_ComponentGroupDto,
  AssembleBikeComponentsDto,
  Response_MountedComponentsDto,
  Response_ComponentDto,
} from './dto/response-components';
import { CustomComponentsDto } from './dto/create-components';

@Controller('components')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  // ---------- POST Custom Component Type with user id ----------
  @Post()
  @ApiResponse({ status: 201, type: Response_ComponentDto })
  async createComponentType(@Body() dto: CustomComponentsDto): Promise<Response_ComponentDto> {
    return await this.componentService.createComponentType(dto);
  }

  // ---------- GET default components for manual bike creation ----------
  @Get('/default-components')
  @ApiResponse({ status: 200, type: AssembleBikeComponentsDto, isArray: true })
  async getDefaultComponents(@Query('ebike') ebike?: string): Promise<AssembleBikeComponentsDto[]> {
    const isEbike = ebike === 'true';
    return await this.componentService.getComponentsDefaults(isEbike);
  }

  // ---------- GET All Groups ----------
  @Get('groups')
  @ApiResponse({ status: 200, type: Response_ComponentGroupDto, isArray: true })
  async getGroups(): Promise<Response_ComponentGroupDto[]> {
    return await this.componentService.getAllComponentGroups();
  }

  // ---------- GET Mounted Components based on bike ID ----------
  @Get('mounted-components')
  @ApiResponse({ status: 200, type: Response_MountedComponentsDto, isArray: true })
  async getMountedComponents(@Query('bikeId') bikeId: string): Promise<Response_MountedComponentsDto[]> {
    return await this.componentService.getMountedComponents(bikeId);
  }
  // ---------- GET mounted components for a bike ----------
  // Update endpoint for mounted components, and delete
  // Create, Update system with userid components
  //
}

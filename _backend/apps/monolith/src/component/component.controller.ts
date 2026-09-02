import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ComponentService } from './component.service';
import {
  Response_ComponentGroupDto,
  AssembleBikeComponentsDto,
  Response_BikeComponentDto,
  Response_ComponentDto,
} from './dto/response-components';
import { CreateBikeComponentDto, CustomComponentsDto } from './dto/create-components';
import { DismountComponentDto, UpdateMountedComponentDto } from './dto/update-components';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// A pass-through: which parts a caller may read and what a part will accept is decided in
// ComponentService and nowhere else.
@Controller('components')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  // ---------- POST Custom Component Type, owned by the caller ----------
  @Post()
  @ApiResponse({ status: 201, type: Response_ComponentDto })
  async createComponentType(
    @CurrentUser('userId') userId: string,
    @Body() dto: CustomComponentsDto,
  ): Promise<Response_ComponentDto> {
    return await this.componentService.createComponentType(dto, Number(userId));
  }

  // ---------- GET default components for manual bike creation ----------
  @Get('/default-components')
  @ApiResponse({ status: 200, type: AssembleBikeComponentsDto, isArray: true })
  async getDefaultComponents(
    @CurrentUser('userId') userId: string,
    @Query('ebike') ebike?: string,
  ): Promise<AssembleBikeComponentsDto[]> {
    const isEbike = ebike === 'true';
    return await this.componentService.getComponentsDefaults(isEbike, Number(userId));
  }

  // ---------- GET All Groups ----------
  @Get('groups')
  @ApiResponse({ status: 200, type: Response_ComponentGroupDto, isArray: true })
  async getGroups(): Promise<Response_ComponentGroupDto[]> {
    return await this.componentService.getAllComponentGroups();
  }

  // ---------- GET the build of one bike, current parts and dismounted alike ----------
  @Get('mounted-components')
  @ApiResponse({ status: 200, type: Response_BikeComponentDto, isArray: true })
  async getMountedComponents(
    @CurrentUser('userId') userId: string,
    @Query('bikeId', ParseIntPipe) bikeId: number,
  ): Promise<Response_BikeComponentDto[]> {
    return await this.componentService.getBikeComponents(bikeId, Number(userId));
  }

  // ---------- POST a part onto a bike that already exists ----------
  @Post('mounted-components')
  @ApiResponse({ status: 201, type: Response_BikeComponentDto })
  async createMountedComponent(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBikeComponentDto,
  ): Promise<Response_BikeComponentDto> {
    return await this.componentService.createMountedComponent(dto, Number(userId));
  }

  // ---------- PATCH correct a part ----------
  @Patch('mounted-components/:id')
  @ApiResponse({ status: 200, type: Response_BikeComponentDto })
  async updateMountedComponent(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMountedComponentDto,
  ): Promise<Response_BikeComponentDto> {
    return await this.componentService.updateMountedComponent(id, dto, Number(userId));
  }

  // ---------- PATCH take a part off the bike ----------
  @Patch('mounted-components/:id/dismount')
  @ApiResponse({ status: 200, type: Response_BikeComponentDto })
  async dismountComponent(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DismountComponentDto,
  ): Promise<Response_BikeComponentDto> {
    return await this.componentService.dismountComponent(id, dto, Number(userId));
  }

  // ---------- DELETE a part that should never have existed ----------
  @Delete('mounted-components/:id')
  @ApiResponse({ status: 200, type: Response_BikeComponentDto })
  async deleteMountedComponent(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Response_BikeComponentDto> {
    return await this.componentService.deleteMountedComponent(id, Number(userId));
  }
}

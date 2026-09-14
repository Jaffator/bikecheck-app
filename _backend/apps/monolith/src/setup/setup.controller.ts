import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { SetupService } from './setup.service';
import { CreateSetupProfileDto } from './dto/create-setup-profile.dto';
import { UpdateSetupProfileDto } from './dto/update-setup-profile.dto';
import { Response_SetupProfileDto } from './dto/response-setup-profile.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// A pass-through: whose profiles a caller may read and what a profile accepts is decided in
// SetupService and nowhere else. Everything served here is psi.
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  // ---------- GET the Setup Profiles of one bike, oldest first ----------
  @Get('bike/:bikeId')
  @ApiResponse({ status: 200, type: Response_SetupProfileDto, isArray: true })
  @ApiResponse({ status: 404, description: "Bike not found or not the caller's" })
  async findByBike(
    @CurrentUser('userId') userId: string,
    @Param('bikeId', ParseIntPipe) bikeId: number,
  ): Promise<Response_SetupProfileDto[]> {
    return await this.setupService.findByBike(bikeId, Number(userId));
  }

  // ---------- POST a new profile, blank or copied from another of the same bike ----------
  @Post('bike/:bikeId')
  @ApiResponse({ status: 201, type: Response_SetupProfileDto })
  @ApiResponse({ status: 404, description: 'Bike, or the profile to copy, not found on this bike' })
  @ApiResponse({ status: 409, description: 'Bike is archived, or the name is already taken on it' })
  async create(
    @CurrentUser('userId') userId: string,
    @Param('bikeId', ParseIntPipe) bikeId: number,
    @Body() dto: CreateSetupProfileDto,
  ): Promise<Response_SetupProfileDto> {
    return await this.setupService.create(bikeId, Number(userId), dto);
  }

  // ---------- PATCH rewrite a profile in place ----------
  @Patch(':id')
  @ApiResponse({ status: 200, type: Response_SetupProfileDto })
  @ApiResponse({ status: 404, description: "Profile not found or not the caller's" })
  @ApiResponse({ status: 409, description: 'Bike is archived, or the name is already taken on it' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSetupProfileDto,
  ): Promise<Response_SetupProfileDto> {
    return await this.setupService.update(id, Number(userId), dto);
  }

  // ---------- DELETE a profile, the last one included ----------
  @Delete(':id')
  @ApiResponse({ status: 200, type: Response_SetupProfileDto })
  @ApiResponse({ status: 404, description: "Profile not found or not the caller's" })
  @ApiResponse({ status: 409, description: 'Bike is archived' })
  async delete(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Response_SetupProfileDto> {
    return await this.setupService.delete(id, Number(userId));
  }
}

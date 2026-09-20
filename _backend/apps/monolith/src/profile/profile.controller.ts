import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResponseProfileDto } from './dto/response-profile.dto';
import { ResponseProfileGarageDto } from './dto/response-profile-garage.dto';
import { ResponseProfileBikeDto } from './dto/response-profile-bike.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ---------- GET the caller's own settings ----------
  @ApiOperation({ summary: "The caller's Public Profile settings, or the OFF defaults and a suggested handle" })
  @ApiResponse({ status: 200, type: ResponseProfileDto })
  @Get('me')
  async getMine(@CurrentUser('userId') userId: string): Promise<ResponseProfileDto> {
    return await this.profileService.getMine(Number(userId));
  }

  // ---------- PATCH any subset of the caller's own settings ----------
  @ApiOperation({ summary: "Save any subset of the caller's Public Profile settings" })
  @ApiResponse({ status: 200, type: ResponseProfileDto })
  @ApiResponse({
    status: 400,
    description:
      'HANDLE_TOO_SHORT | HANDLE_TOO_LONG | HANDLE_INVALID_CHARS | HANDLE_LEADING_DASH | HANDLE_RESERVED | HANDLE_REQUIRED',
  })
  @ApiResponse({ status: 409, description: 'HANDLE_TAKEN' })
  @Patch('me')
  async updateMine(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto): Promise<ResponseProfileDto> {
    return await this.profileService.updateMine(Number(userId), dto);
  }

  // ---------- GET somebody's garage, in the app ----------
  // Declared after `me`, which a handle can never be: three characters is the minimum.
  @ApiOperation({
    summary: "A Public Profile's garage for the app: always the header, the garage when the rule allows",
  })
  @ApiResponse({ status: 200, type: ResponseProfileGarageDto })
  @ApiResponse({ status: 404, description: 'Off, no profile or a handle nobody holds - one answer for all three' })
  @Get(':handle')
  async read(
    @CurrentUser('userId') userId: string,
    @Param('handle') handle: string,
  ): Promise<ResponseProfileGarageDto> {
    return await this.profileService.read(handle, Number(userId));
  }

  // ---------- GET one of somebody's bikes, in the app ----------
  @ApiOperation({ summary: 'One bike of a Public Profile for the app: the hero and the sections the owner shares' })
  @ApiResponse({ status: 200, type: ResponseProfileBikeDto })
  @ApiResponse({
    status: 404,
    description: 'Not readable by the rule, or a bike that is unknown, unshared or archived - one answer for all',
  })
  @Get(':handle/bikes/:id')
  async readBike(
    @CurrentUser('userId') userId: string,
    @Param('handle') handle: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseProfileBikeDto> {
    return await this.profileService.readBike(handle, id, Number(userId));
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResponseProfileDto } from './dto/response-profile.dto';
import { ResponseProfileGarageDto, ResponsePublicProfileGarageDto } from './dto/response-profile-garage.dto';
import { ResponseProfileBikeDto, ResponseProfileServicesDto } from './dto/response-profile-bike.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

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

  // ---------- GET somebody's garage, on the web (no auth) ----------
  // The one read that counts a view; the throttler answers 429 before it, so a burst does
  // not. `public` is a reserved handle, so this can never shadow a garage.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Public()
  @ApiOperation({ summary: "A Public Profile's garage for the web page: open only while PUBLIC" })
  @ApiResponse({ status: 200, type: ResponsePublicProfileGarageDto })
  @ApiResponse({ status: 404, description: 'Off, followers only, no profile or a handle nobody holds - one answer' })
  @Get('public/:handle')
  async readPublic(
    @Param('handle') handle: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResponsePublicProfileGarageDto> {
    // Set before the read so the 404 is never cached either: Off takes effect on the next request.
    res.setHeader('Cache-Control', 'no-store');
    return await this.profileService.readPublic(handle);
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

  // ---------- GET older Services of one of somebody's bikes, in the app ----------
  @ApiOperation({ summary: 'One page of the Services the bike page did not carry, newest first' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Default 20, at most 100' })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({ status: 200, type: ResponseProfileServicesDto })
  @ApiResponse({ status: 404, description: 'The same as the bike route, and a history the owner keeps in' })
  @Get(':handle/bikes/:id/services')
  async readBikeServices(
    @CurrentUser('userId') userId: string,
    @Param('handle') handle: string,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ResponseProfileServicesDto> {
    // An absent limit/offset reaches the service as NaN and takes its default, as the
    // bike-event history reads them - Number('') is 0, which would ask for an empty page.
    return await this.profileService.readBikeServices(handle, id, Number(userId), toNumber(limit), toNumber(offset));
  }
}

// A query parameter the caller left out is not a number at all.
function toNumber(value?: string): number {
  return value === undefined || value === '' ? Number.NaN : Number(value);
}

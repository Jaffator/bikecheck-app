import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResponseProfileDto } from './dto/response-profile.dto';
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
}

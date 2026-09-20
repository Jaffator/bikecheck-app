import { Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { ResponseFollowDto } from './dto/response-follow.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Every route is authenticated: the web page /u/* has no follow control.
@Controller('follows')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // ---------- POST follow somebody ----------
  @ApiOperation({ summary: 'Follow a Public profile by its handle; a row that already stands is answered as it is' })
  @ApiResponse({ status: 201, type: ResponseFollowDto })
  @ApiResponse({ status: 400, description: 'CANNOT_FOLLOW_SELF' })
  @ApiResponse({ status: 404, description: 'Off, no profile or a handle nobody holds - one answer for all' })
  @Post(':handle')
  async follow(@CurrentUser('userId') userId: string, @Param('handle') handle: string): Promise<ResponseFollowDto> {
    return await this.followService.follow(Number(userId), handle);
  }

  // ---------- DELETE stop following ----------
  @ApiOperation({ summary: 'Stop following somebody; the same 204 with no row to remove' })
  @ApiResponse({ status: 204 })
  @Delete(':handle')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(@CurrentUser('userId') userId: string, @Param('handle') handle: string): Promise<void> {
    await this.followService.unfollow(Number(userId), handle);
  }
}

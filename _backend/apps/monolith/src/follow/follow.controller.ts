import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { ResponseFollowDto } from './dto/response-follow.dto';
import { FollowerRowDto } from './dto/response-follower.dto';
import { FollowingRowDto, ResponseFollowSearchDto } from './dto/response-following.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Every route is authenticated: the web page /u/* has no search and no follow control.
@Controller('follows')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // ---------- GET find people ----------
  // Per user rather than per address (UserThrottlerGuard): a typed search is a burst by nature.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Discoverable riders by handle prefix or a word of their name; the first 20' })
  @ApiQuery({ name: 'q', type: String, description: '2 to 50 characters once trimmed' })
  @ApiResponse({ status: 200, type: ResponseFollowSearchDto })
  @ApiResponse({ status: 400, description: 'QUERY_TOO_SHORT | QUERY_TOO_LONG' })
  @Get('search')
  async search(@CurrentUser('userId') userId: string, @Query('q') q?: string): Promise<ResponseFollowSearchDto> {
    return await this.followService.search(Number(userId), q ?? '');
  }

  // ---------- GET whom I follow ----------
  @ApiOperation({ summary: 'Whom I follow and whom I asked, one list ordered by name' })
  @ApiResponse({ status: 200, type: [FollowingRowDto] })
  @Get('following')
  async following(@CurrentUser('userId') userId: string): Promise<FollowingRowDto[]> {
    return await this.followService.following(Number(userId));
  }

  // ---------- GET who follows me ----------
  // The incoming side is keyed by the follower's user id: a follower may have no handle.
  @ApiOperation({ summary: 'Who asked me (PENDING) and who follows me (ACCEPTED), one list ordered by name' })
  @ApiResponse({ status: 200, type: [FollowerRowDto] })
  @Get('followers')
  async followers(@CurrentUser('userId') userId: string): Promise<FollowerRowDto[]> {
    return await this.followService.followers(Number(userId));
  }

  // ---------- POST accept a request ----------
  @ApiOperation({ summary: 'Accept a Follow Request: the asker is told and their garage opens' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'No PENDING row from this user' })
  @Post('followers/:userId/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async accept(
    @CurrentUser('userId') userId: string,
    @Param('userId', ParseIntPipe) followerId: number,
  ): Promise<void> {
    await this.followService.accept(Number(userId), followerId);
  }

  // ---------- DELETE decline or remove ----------
  @ApiOperation({ summary: 'Decline a request or remove a follower; nobody is told, the same 204 with no row' })
  @ApiResponse({ status: 204 })
  @Delete('followers/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFollower(
    @CurrentUser('userId') userId: string,
    @Param('userId', ParseIntPipe) followerId: number,
  ): Promise<void> {
    await this.followService.removeFollower(Number(userId), followerId);
  }

  // ---------- POST follow somebody ----------
  @ApiOperation({
    summary:
      'Follow a Public profile or ask to follow a Followers-only one; a row that already stands is answered as it is',
  })
  @ApiResponse({ status: 201, type: ResponseFollowDto })
  @ApiResponse({ status: 400, description: 'CANNOT_FOLLOW_SELF' })
  @ApiResponse({ status: 404, description: 'Off, no profile or a handle nobody holds - one answer for all' })
  @Post(':handle')
  async follow(@CurrentUser('userId') userId: string, @Param('handle') handle: string): Promise<ResponseFollowDto> {
    return await this.followService.follow(Number(userId), handle);
  }

  // ---------- DELETE withdraw or stop following ----------
  @ApiOperation({ summary: 'Withdraw a request or stop following somebody; the same 204 with no row to remove' })
  @ApiResponse({ status: 204 })
  @Delete(':handle')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(@CurrentUser('userId') userId: string, @Param('handle') handle: string): Promise<void> {
    await this.followService.unfollow(Number(userId), handle);
  }
}

import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StravaEventsService } from './strava.service';

@Controller('strava')
export class StravaController {
  constructor(private readonly stravaEventService: StravaEventsService) {}

  // ---------- GET notifications for current user ----------
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiResponse({ status: 200, type: ResponseNotificationDto, isArray: true })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  @Get()
  list(@CurrentUser('userId') userId: string, @Query('unread') unread?: string): Promise<ResponseNotificationDto[]> {
    return this.notificationService.list(Number(userId), unread === 'true');
  }

  // ---------- PATCH mark notification as read ----------
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200 })
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser('userId') userId: string): Promise<void> {
    return this.notificationService.markRead(+id, Number(userId));
  }
}

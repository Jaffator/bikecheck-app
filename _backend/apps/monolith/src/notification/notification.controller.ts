import { Controller, Get, Patch, Param, Query, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { ResponseNotificationDto } from './dto/response-notification.dto';
import { DeviceTokenDto } from './dto/device-token-.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ---------- POST FCM token ----------
  @ApiOperation({ summary: 'Register FCM token for the current user' })
  @ApiResponse({ status: 200 })
  @Post('fcm-token')
  // Returns a body on purpose: the shared frontend client parses every 2xx as
  // JSON, and an empty response would leave it parsing nothing.
  async registerFcmToken(
    @CurrentUser('userId') userId: string,
    @Body() deviceTokenDto: DeviceTokenDto,
  ): Promise<{ success: boolean }> {
    await this.notificationService.registerFcmToken(Number(userId), deviceTokenDto);
    return { success: true };
  }

  // ---------- GET notifications for current user ----------
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiResponse({ status: 200, type: ResponseNotificationDto, isArray: true })
  @ApiQuery({ name: 'unread', required: false, type: Boolean, description: 'Every unread row, never paged' })
  @ApiQuery({ name: 'before', required: false, type: Number, description: 'Only rows with a lower id (cursor)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Page size, default 30, max 100' })
  @Get()
  async list(
    @CurrentUser('userId') userId: string,
    @Query('unread') unread?: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ): Promise<ResponseNotificationDto[]> {
    return this.notificationService.list(Number(userId), {
      unreadOnly: unread === 'true',
      before: optionalNumber(before),
      limit: optionalNumber(limit),
    });
  }

  // ---------- PATCH mark everything the list clears ----------
  @ApiOperation({ summary: 'Mark every notification the list clears on view as read' })
  @ApiResponse({ status: 200 })
  @Patch('viewed')
  // Returns a body on purpose: the shared frontend client parses every 2xx as
  // JSON, and an empty response would leave it parsing nothing.
  async markAllViewed(@CurrentUser('userId') userId: string): Promise<{ success: boolean }> {
    await this.notificationService.markAllViewed(Number(userId));
    return { success: true };
  }

  // ---------- PATCH mark notification as read ----------
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200 })
  @Patch(':id/read')
  // Returns a body on purpose: the shared frontend client parses every 2xx as
  // JSON, and an empty response would leave it parsing nothing.
  async markRead(@Param('id') id: string, @CurrentUser('userId') userId: string): Promise<{ success: boolean }> {
    await this.notificationService.markRead(+id, Number(userId));
    return { success: true };
  }
}

// An absent, empty or non-numeric query value is no value, not 0 or NaN.
function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

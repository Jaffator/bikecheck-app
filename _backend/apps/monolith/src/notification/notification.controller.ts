import { Controller, Get, Patch, Param, Query, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { ResponseNotificationDto } from './dto/response-notification.dto';
import { DeviceTokenDto } from './dto/device-token-.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ---------- POST FCM token ----------
  // ⚠️ TEMPORARY for local testing: @Public + hardcoded user 1 (no login yet).
  // Revert to @CurrentUser('userId') once auth is wired on the frontend.
  @Public()
  @ApiOperation({ summary: 'Register FCM token for the current user' })
  @ApiResponse({ status: 200 })
  @Post('fcm-token')
  registerFcmToken(@Body() deviceTokenDto: DeviceTokenDto): Promise<void> {
    console.log('Registering FCM token for user 47:', deviceTokenDto.token, deviceTokenDto.platform);
    return this.notificationService.registerFcmToken(47, deviceTokenDto);
  }

  // ⚠️ TEMPORARY test endpoint: triggers a push notification for user 1. Remove before commit.
  @Public()
  @ApiOperation({ summary: 'TEST: send a push notification to user 1' })
  @ApiResponse({ status: 201 })
  @Post('test-push')
  async testPush(): Promise<void> {
    return this.notificationService.create({
      userId: 47,
      type: 'maintenance_due',
      title: 'Test push 🔔',
      body: 'Testovací notifikace z backendu',
    });
  }

  // ---------- GET notifications for current user ----------
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiResponse({ status: 200, type: ResponseNotificationDto, isArray: true })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  @Get()
  async list(
    @CurrentUser('userId') userId: string,
    @Query('unread') unread?: string,
  ): Promise<ResponseNotificationDto[]> {
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

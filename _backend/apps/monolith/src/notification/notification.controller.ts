import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { ResponseNotificationDto } from './dto/response-notification.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

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

import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { getLoggerToken } from 'nestjs-pino';
import { NotificationProcessor } from './notification.processor';
import { NotificationDeliveryJob } from './notification.service';
import { PushService } from './push.service';
import { PrismaService } from '../../prisma/prisma.service';

const USER_ID = 7;
const NOTIFICATION_ID = 42;

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  const mockPrisma = {
    notifications: { findUnique: jest.fn() },
    users: { findUnique: jest.fn() },
  };
  const mockPushService = { sendToUser: jest.fn() };
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  // A stored notification of a type whose config carries the 'push' channel.
  function notificationRow(): Record<string, unknown> {
    return {
      id: NOTIFICATION_ID,
      user_id: USER_ID,
      type: 'strava_activity_saved',
      title: 'Ride saved',
      body: 'Your ride landed on Enduro',
      payload: { bikeId: 3 },
      is_read: false,
    };
  }

  function deliveryJob(): Job<NotificationDeliveryJob> {
    return { data: { notificationId: NOTIFICATION_ID } } as Job<NotificationDeliveryJob>;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PushService, useValue: mockPushService },
        { provide: getLoggerToken(NotificationProcessor.name), useValue: mockLogger },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    mockPrisma.notifications.findUnique.mockResolvedValue(notificationRow());
  });

  // The Settings switch mutes push only. The row is written before the job is queued,
  // so the bell counts it either way — only the lock screen goes quiet.
  describe('push mute', () => {
    it('does not push when the user turned notifications off', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ notifications_enabled: false });

      await processor.process(deliveryJob());

      expect(mockPushService.sendToUser).not.toHaveBeenCalled();
    });

    it('pushes when the user has notifications on', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ notifications_enabled: true });

      await processor.process(deliveryJob());

      expect(mockPushService.sendToUser).toHaveBeenCalledWith(USER_ID, 'Ride saved', 'Your ride landed on Enduro', {
        type: 'strava_activity_saved',
        route: '/bikes/3',
      });
    });

    // Null is what a user who never touched the switch reads back as.
    it('pushes when the flag was never set', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ notifications_enabled: null });

      await processor.process(deliveryJob());

      expect(mockPushService.sendToUser).toHaveBeenCalledTimes(1);
    });
  });
});

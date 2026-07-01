import { PrismaClient } from '@prisma/client';
import { CreateUserData } from '../../src/user/interfaces/user.interface';

export class SeedActionIntervals {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  private async actionIntervals() {
    const testUser: CreateUserData = {
      email: 'test@test123.com',
      name: 'Test User123',
      password_hash: 'testing123456',
      googleId: null,
      is_active: true,
      language: 'en',
      avatar_url: '',
    };
    try {
      await this.prisma.users.create({
        data: { ...testUser },
      });
      console.log(`✅ users - seeded OK, inserted: 1 item`);
    } catch (error) {
      throw new Error(`Failed to seed new user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  async run(): Promise<void> {
    await this.actionIntervals();
  }
}

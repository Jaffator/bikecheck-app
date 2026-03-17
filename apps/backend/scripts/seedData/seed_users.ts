import { PrismaClient } from '@prisma/client';
import { CreateUserData } from 'src/user/interfaces/user.interface';

export class SeedUser {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  private async createUser() {
    const testUser: CreateUserData = {
      email: 'test@test.com',
      name: 'Test User',
      password_hash: 'testing123456',
      googleId: '',
      is_active: true,
      language: 'en',
      avatar_url: '',
    };
    try {
      await this.prisma.users.create({
        data: { ...testUser },
      });
    } catch (error) {
      throw new Error(`Failed to seed new user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  async runSeedUser(): Promise<void> {
    await this.createUser();
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

// The writes are conditional in SQL, so they are asked of a real database.
describe('User onboarding state (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  // Logged in once: login is throttled to 5 a minute.
  let token: string | undefined;

  const stamp = Date.now();
  const rider = { name: `onboarding-${stamp}`, email: `onboarding-${stamp}@bikecheck.test`, password: 'abcd1234' };

  const post = (path: string): request.Test =>
    request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    await request(app.getHttpServer()).post('/api/auth/register').send(rider).expect(201);
    // Login is closed until the address is verified (ADR 0031).
    const user = await prisma.users.update({
      where: { email: rider.email },
      data: { email_verified_at: new Date() },
    });
    userId = user.id;

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: rider.email, password: rider.password })
      .expect(200);
    token = setCookie.parse(response.header['set-cookie']).find((cookie) => cookie.name === 'access_token')?.value;
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts a new account with null, empty and true', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({ welcome_seen_at: null, hints_seen: [], hints_enabled: true });
  });

  it('keeps the first Welcome stamp on a repeat call', async () => {
    const first = await post('/api/users/me/welcome-seen').expect(200);
    const second = await post('/api/users/me/welcome-seen').expect(200);

    expect(first.body.welcome_seen_at).not.toBeNull();
    expect(second.body.welcome_seen_at).toBe(first.body.welcome_seen_at);
  });

  it('adds a Hint once, even from two devices at the same moment', async () => {
    await Promise.all([
      post('/api/users/me/hints/reports').expect(200),
      post('/api/users/me/hints/reports').expect(200),
    ]);
    const response = await post('/api/users/me/hints/setup').expect(200);

    expect(response.body.hints_seen).toEqual(['reports', 'setup']);
  });

  it('refuses a key that is no Hint', async () => {
    await post('/api/users/me/hints/not_a_hint').expect(400);
  });

  it('refuses both writes without a session', async () => {
    await request(app.getHttpServer()).post('/api/users/me/welcome-seen').expect(401);
    await request(app.getHttpServer()).post('/api/users/me/hints/setup').expect(401);
  });

  it('switches Hints through PATCH users/:id', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hints_enabled: false })
      .expect(200);

    expect(response.body.hints_enabled).toBe(false);
  });
});

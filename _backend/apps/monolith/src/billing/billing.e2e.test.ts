import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

describe('Bike limit (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: number;
  // Logged in once: login is throttled to 5 a minute.
  let accessToken: string | undefined;
  // R2 is the one thing not reached; it also shows whether a refused photo was stored.
  const storage = { uploadImageR2CloudFare: jest.fn().mockResolvedValue('https://storage.test/bike.webp') };

  const stamp = Date.now();
  const rider = { name: `limit-${stamp}`, email: `limit-${stamp}@bikecheck.test`, password: 'abcd1234' };

  const createBike = (model: string): request.Test =>
    request(app.getHttpServer())
      .post('/api/bike/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .field(
        'data',
        JSON.stringify({
          bike: {
            bike_brand: 'Canyon',
            bike_model: model,
            ebike: false,
            has_front_suspension: true,
            has_rear_suspension: true,
          },
          components: [],
        }),
      );

  const addBike = async (model: string): Promise<number> => {
    const response = await createBike(model).expect(201);
    return response.body.id;
  };

  const expectRefused = async (attempt: request.Test): Promise<void> => {
    const response = await attempt.expect(403);
    expect(response.body.message).toBe('BIKE_LIMIT_REACHED');
  };

  const archive = async (id: number): Promise<void> => {
    await request(app.getHttpServer())
      .delete(`/api/bike/delsoft/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  };

  const setLimit = async (limit: number): Promise<void> => {
    await prisma.users.update({ where: { id: userId }, data: { bike_limit: limit } });
  };

  const readLimit = async (): Promise<unknown> => {
    const response = await request(app.getHttpServer())
      .get('/api/billing/bike-limit')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    return response.body;
  };

  const garage = async (): Promise<number[]> => {
    const response = await request(app.getHttpServer())
      .get('/api/bike')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const bikes: { id: number }[] = response.body;
    return bikes.map(({ id }) => id).sort((a, b) => a - b);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue(storage)
      .compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    // Login is closed until the address is verified (ADR 0031); auth.e2e covers the link itself.
    await request(app.getHttpServer()).post('/api/auth/register').send(rider).expect(201);
    const user = await prisma.users.update({ where: { email: rider.email }, data: { email_verified_at: new Date() } });
    userId = user.id;
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: rider.email, password: rider.password })
      .expect(200);
    accessToken = setCookie.parse(login.header['set-cookie']).find((item) => item.name === 'access_token')?.value;
  });

  afterAll(async () => {
    await app.close();
  });

  // Runs first, before any test sets a limit, so what it reads is the default.
  it('gives a new account one place and no bike in it', async () => {
    expect(await readLimit()).toEqual({ bike_limit: 1, bike_count: 0, has_archived_bikes: false });
  });

  it('keeps the limit behind the session', async () => {
    await request(app.getHttpServer()).get('/api/billing/bike-limit').expect(401);
  });

  describe('creating a bike', () => {
    beforeEach(async () => {
      await prisma.bikes.deleteMany({ where: { user_id: userId } });
      await setLimit(1);
      storage.uploadImageR2CloudFare.mockClear();
    });

    it('adds the first and refuses the second', async () => {
      const id = await addBike('Spectral');

      await expectRefused(createBike('Grail'));

      expect(await garage()).toEqual([id]);
      expect(await readLimit()).toEqual({ bike_limit: 1, bike_count: 1, has_archived_bikes: false });
    });

    it('refuses before the photo is stored', async () => {
      await addBike('Spectral');

      await expectRefused(createBike('Grail').attach('image', Buffer.from('image-bytes'), 'bike.jpg'));

      expect(storage.uploadImageR2CloudFare).not.toHaveBeenCalled();
    });

    it('adds up to a limit raised by hand', async () => {
      await setLimit(2);
      await addBike('Spectral');
      await addBike('Grail');

      await expectRefused(createBike('Aeroad'));
    });

    it('counts an archived bike', async () => {
      await archive(await addBike('Spectral'));

      await expectRefused(createBike('Grail'));

      expect(await readLimit()).toEqual({ bike_limit: 1, bike_count: 1, has_archived_bikes: true });
    });

    it('takes the place a deleted bike freed', async () => {
      const id = await addBike('Spectral');
      await archive(id);
      await request(app.getHttpServer())
        .delete(`/api/bike/delhard/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const next = await addBike('Grail');

      expect(await garage()).toEqual([next]);
    });

    it('never stops an archived bike coming back over the limit', async () => {
      await setLimit(2);
      const kept = await addBike('Spectral');
      const archived = await addBike('Grail');
      await archive(archived);
      await setLimit(1);

      await request(app.getHttpServer())
        .post(`/api/bike/unarchive/${archived}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(await garage()).toEqual([kept, archived]);
    });

    it('is all an account over the limit loses: its bikes still read', async () => {
      await setLimit(2);
      const first = await addBike('Spectral');
      const second = await addBike('Grail');
      await setLimit(1);

      expect(await garage()).toEqual([first, second]);
      await request(app.getHttpServer())
        .get(`/api/bike/${second}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      await expectRefused(createBike('Aeroad'));
    });

    it('adds one bike when two arrive at once for the last place', async () => {
      const responses = await Promise.all([createBike('Spectral'), createBike('Grail')]);

      expect(responses.map(({ status }) => status).sort()).toEqual([201, 403]);
      expect(await garage()).toHaveLength(1);
    });
  });
});

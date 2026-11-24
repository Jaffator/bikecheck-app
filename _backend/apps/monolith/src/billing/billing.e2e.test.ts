import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { bike_keys } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

interface Rider {
  id: number;
  accessToken: string | undefined;
}

describe('Bike limit (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  // Who the requests below speak for, unless told otherwise.
  let rider: Rider;
  let signedUp = 0;
  // R2 is the one thing not reached; it also shows whether a refused photo was stored.
  const storage = { uploadImageR2CloudFare: jest.fn().mockResolvedValue('https://storage.test/bike.webp') };

  const stamp = Date.now();

  // Each from an address of its own: register and login are throttled by it, and a key by account.
  const signUp = async (): Promise<Rider> => {
    signedUp += 1;
    const address = `10.0.0.${signedUp}`;
    const name = `limit-${stamp}-${signedUp}`;
    const credentials = { email: `${name}@bikecheck.test`, password: 'abcd1234' };
    const post = (path: string): request.Test =>
      request(app.getHttpServer()).post(path).set('X-Forwarded-For', address);

    await post('/api/auth/register')
      .send({ name, ...credentials })
      .expect(201);
    // Login is closed until the address is verified (ADR 0031); auth.e2e covers the link itself.
    const user = await prisma.users.update({
      where: { email: credentials.email },
      data: { email_verified_at: new Date() },
    });
    const login = await post('/api/auth/login').send(credentials).expect(200);
    const accessToken = setCookie.parse(login.header['set-cookie']).find((item) => item.name === 'access_token')?.value;
    return { id: user.id, accessToken };
  };

  const createBike = (model: string): request.Test =>
    request(app.getHttpServer())
      .post('/api/bike/create')
      .set('Authorization', `Bearer ${rider.accessToken}`)
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
      .set('Authorization', `Bearer ${rider.accessToken}`)
      .expect(200);
  };

  const setLimit = async (limit: number): Promise<void> => {
    await prisma.users.update({ where: { id: rider.id }, data: { bike_limit: limit } });
  };

  const readLimit = async (): Promise<unknown> => {
    const response = await request(app.getHttpServer())
      .get('/api/billing/bike-limit')
      .set('Authorization', `Bearer ${rider.accessToken}`)
      .expect(200);
    return response.body;
  };

  const garage = async (): Promise<number[]> => {
    const response = await request(app.getHttpServer())
      .get('/api/bike')
      .set('Authorization', `Bearer ${rider.accessToken}`)
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
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    rider = await signUp();
  });

  afterAll(async () => {
    await app.close();
  });

  // Runs first, before any test sets a limit, so what it reads is the default.
  it('gives a new account one place and no bike in it', async () => {
    expect(await readLimit()).toEqual({ bike_limit: 1, bike_count: 0, has_archived_bikes: false, key_used: false });
  });

  it('keeps the limit behind the session', async () => {
    await request(app.getHttpServer()).get('/api/billing/bike-limit').expect(401);
  });

  describe('creating a bike', () => {
    beforeEach(async () => {
      await prisma.bikes.deleteMany({ where: { user_id: rider.id } });
      await setLimit(1);
      storage.uploadImageR2CloudFare.mockClear();
    });

    it('adds the first and refuses the second', async () => {
      const id = await addBike('Spectral');

      await expectRefused(createBike('Grail'));

      expect(await garage()).toEqual([id]);
      expect(await readLimit()).toEqual({ bike_limit: 1, bike_count: 1, has_archived_bikes: false, key_used: false });
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

      expect(await readLimit()).toEqual({ bike_limit: 1, bike_count: 1, has_archived_bikes: true, key_used: false });
    });

    it('takes the place a deleted bike freed', async () => {
      const id = await addBike('Spectral');
      await archive(id);
      await request(app.getHttpServer())
        .delete(`/api/bike/delhard/${id}`)
        .set('Authorization', `Bearer ${rider.accessToken}`)
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
        .set('Authorization', `Bearer ${rider.accessToken}`)
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
        .set('Authorization', `Bearer ${rider.accessToken}`)
        .expect(200);
      await expectRefused(createBike('Aeroad'));
    });

    it('adds one bike when two arrive at once for the last place', async () => {
      const responses = await Promise.all([createBike('Spectral'), createBike('Grail')]);

      expect(responses.map(({ status }) => status).sort()).toEqual([201, 403]);
      expect(await garage()).toHaveLength(1);
    });
  });

  describe('redeeming a key', () => {
    let keys = 0;

    const addKey = async (maxAccounts = 20): Promise<bike_keys> => {
      keys += 1;
      return await prisma.bike_keys.create({
        data: { code: `Early-${stamp}-${keys}`, bike_limit: 2, max_accounts: maxAccounts },
      });
    };

    const redeem = (code: string, as: Rider = rider): request.Test =>
      request(app.getHttpServer())
        .post('/api/billing/redeem-key')
        .set('Authorization', `Bearer ${as.accessToken}`)
        .send({ code });

    const expectUsedUp = async (attempt: request.Test): Promise<void> => {
      const response = await attempt.expect(409);
      expect(response.body.message).toBe('KEY_USED_UP');
    };

    const expectNotValid = async (attempt: request.Test): Promise<void> => {
      const response = await attempt.expect(404);
      expect(response.body.message).toBe('KEY_NOT_VALID');
    };

    const fresh = { bike_limit: 1, bike_count: 0, has_archived_bikes: false, key_used: false };
    const unlocked = { ...fresh, bike_limit: 2, key_used: true };

    beforeEach(async () => {
      rider = await signUp();
    });

    it('lets the second bike in and refuses the third', async () => {
      const { code } = await addKey();
      await addBike('Spectral');
      await expectRefused(createBike('Grail'));

      const response = await redeem(code).expect(200);

      expect(response.body).toEqual({ ...unlocked, bike_count: 1 });
      await addBike('Grail');
      await expectRefused(createBike('Aeroad'));
      expect(await readLimit()).toEqual({ ...unlocked, bike_count: 2 });
    });

    it('does not mind letter case and surrounding spaces', async () => {
      const { code } = await addKey();

      const response = await redeem(`  ${code.toUpperCase()} `).expect(200);

      expect(response.body).toEqual(unlocked);
    });

    it('refuses a key that does not exist', async () => {
      await expectNotValid(redeem(`nothing-${stamp}`));

      expect(await readLimit()).toEqual(fresh);
    });

    it('refuses an empty key', async () => {
      await redeem('   ').expect(400);
    });

    it('is closed without a session', async () => {
      const { code } = await addKey();

      await request(app.getHttpServer()).post('/api/billing/redeem-key').send({ code }).expect(401);
    });

    it('refuses a key all its accounts have used', async () => {
      const { code } = await addKey(1);
      await redeem(code, await signUp()).expect(200);

      await expectUsedUp(redeem(code));

      expect(await readLimit()).toEqual(fresh);
    });

    it('is switched off by a maximum of zero', async () => {
      const { code } = await addKey(0);

      await expectUsedUp(redeem(code));
    });

    it('changes nothing for an account that already used one', async () => {
      const used = await addKey(2);
      const other = await addKey();
      await redeem(used.code).expect(200);

      const again = await redeem(used.code).expect(200);
      const another = await redeem(other.code).expect(200);
      const invalid = await redeem(`nothing-${stamp}`).expect(200);

      expect([again.body, another.body, invalid.body]).toEqual([unlocked, unlocked, unlocked]);
      // The repeat took no use of either.
      expect(await prisma.users.count({ where: { bike_key_id: used.id } })).toBe(1);
      expect(await prisma.users.count({ where: { bike_key_id: other.id } })).toBe(0);
    });

    it('never lowers a limit raised by hand', async () => {
      const { code } = await addKey();
      await setLimit(5);

      const response = await redeem(code).expect(200);

      expect(response.body).toEqual({ ...unlocked, bike_limit: 5 });
    });

    it('gets its use back from a deleted account', async () => {
      const { code } = await addKey(1);
      const gone = await signUp();
      await redeem(code, gone).expect(200);
      await expectUsedUp(redeem(code));

      await request(app.getHttpServer())
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${gone.accessToken}`)
        .expect(200);

      await redeem(code).expect(200);
    });

    it('keeps the limit it gave when it is changed, switched off or deleted', async () => {
      const { id, code } = await addKey();
      await redeem(code).expect(200);

      await prisma.bike_keys.update({ where: { id }, data: { code: `${code}-new`, bike_limit: 1, max_accounts: 0 } });
      expect(await readLimit()).toEqual(unlocked);

      await prisma.bike_keys.delete({ where: { id } });
      expect(await readLimit()).toEqual({ ...unlocked, key_used: false });
    });

    it('gives its last use to one of two accounts asking at once', async () => {
      const { id, code } = await addKey(1);
      const second = await signUp();

      const responses = await Promise.all([redeem(code), redeem(code, second)]);

      expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
      expect(await prisma.users.count({ where: { bike_key_id: id } })).toBe(1);
    });

    it('counts once when one account asks twice at once', async () => {
      const { code } = await addKey(1);

      const responses = await Promise.all([redeem(code), redeem(code)]);

      expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    });

    it('is tried at most five times a minute per account', async () => {
      const { code } = await addKey();
      for (let attempt = 0; attempt < 5; attempt += 1) await expectNotValid(redeem(`nothing-${stamp}`));

      await redeem(code).expect(429);

      await redeem(code, await signUp()).expect(200);
    });
  });
});

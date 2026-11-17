import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

const DAY_MS = 24 * 60 * 60 * 1000;
// Seeded catalogue (ADR 0019): a chain, which an Enduro plans a Wear Check (600 km) and a Replacement (800 km) on.
const CHAIN_TYPE_ID = 295;
const CHAIN_WEAR_CHECK = 88;
const CHAIN_REPLACEMENT = 40;

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isoDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

// Every figure is the caller's own, so the stranger's case is a garage that shows none of the owner's.
describe('StatsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bikeId: number;
  let ownerId: number;
  // When the one ride started: three days ago, inside the four weeks the wear pace reads.
  let rideStartedAt: Date;
  // Logged in once each: login is throttled to 5 a minute.
  let ownerToken: string | undefined;
  let strangerToken: string | undefined;

  const stamp = Date.now();
  const owner = { name: `stats-owner-${stamp}`, email: `stats-owner-${stamp}@bikecheck.test`, password: 'abcd1234' };
  const stranger = {
    name: `stats-stranger-${stamp}`,
    email: `stats-stranger-${stamp}@bikecheck.test`,
    password: 'abcd1234',
  };

  const login = async (credentials: { email: string; password: string }): Promise<string | undefined> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    const cookies = setCookie.parse(response.header['set-cookie']);
    return cookies.find((cookie) => cookie.name === 'access_token')?.value;
  };

  // Login is closed until the address is verified (ADR 0031); auth.e2e covers the link itself.
  const registerVerified = async (credentials: typeof owner): Promise<number> => {
    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(201);
    const user = await prisma.users.update({
      where: { email: credentials.email },
      data: { email_verified_at: new Date() },
    });
    return user.id;
  };

  const recordService = async (totalCost: number): Promise<void> => {
    await request(app.getHttpServer())
      .post('/api/bike-events/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bike_id: bikeId, total_cost: totalCost, service_date: '2025-05-10T00:00:00.000Z', actions_done: [] })
      .expect(201);
  };

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

    // ARRANGE: an Enduro whose chain has driven 480 km, one ride and two services on it.
    ownerId = await registerVerified(owner);
    ownerToken = await login(owner);

    const bikeResponse = await request(app.getHttpServer())
      .post('/api/bike/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field(
        'data',
        JSON.stringify({
          bike: {
            bike_brand: 'Santa Cruz',
            bike_model: 'Hightower',
            year: 2022,
            ebike: false,
            has_front_suspension: true,
            has_rear_suspension: true,
            bike_type: 'Enduro',
          },
          components: [{ component_type_id: CHAIN_TYPE_ID, mounted_at: '2025-01-01T00:00:00.000Z' }],
        }),
      )
      .expect(201);
    bikeId = bikeResponse.body.id;

    // The Strava sync grows the accumulator and saves the ride; both are written here instead.
    await prisma.components_mounted.updateMany({ where: { bike_id: bikeId }, data: { drivetrain_km: 480 } });
    rideStartedAt = new Date(Date.now() - 3 * DAY_MS);
    await prisma.rides.create({
      data: {
        user_id: ownerId,
        bike_id: bikeId,
        started_at: rideStartedAt,
        distance_m: 40400,
        drivetrain_meters: 40000,
        duration_min: 120,
        elevation_up_m: 900,
      },
    });

    // A priced service and a free one: the free one still counts as looking after the bike.
    await recordService(350);
    await recordService(0);

    await registerVerified(stranger);
    strangerToken = await login(stranger);
  });

  afterAll(async () => {
    await app.close();
  });

  it('adds up what the services cost, by category and by bike', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stats/spend?period=all')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        from: null,
        to: null,
        total: 350,
        // No action named a category, so the whole receipt stays unassigned.
        categories: [expect.objectContaining({ key: 'unassigned', component_group_id: null, amount: 350 })],
        bikes: [expect.objectContaining({ bike_id: bikeId, bike_brand: 'Santa Cruz', total: 350, service_count: 2 })],
      }),
    );
  });

  it("counts none of another user's spend", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stats/spend?period=all')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(response.body).toEqual(expect.objectContaining({ total: 0, categories: [], bikes: [] }));
  });

  it('spreads the distance each bike covered over the days since the first ride', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stats/distance?period=all')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.from).toBe(isoDay(rideStartedAt.getTime()));
    expect(response.body.bikes).toEqual([
      expect.objectContaining({ bike_id: bikeId, total_km: 40, ride_count: 1, time_min: 120 }),
    ]);
    const [bike] = response.body.bikes;
    expect(sum(bike.daily_m)).toBe(40400);
    expect(sum(bike.daily_elevation_m)).toBe(900);
    expect(sum(bike.daily_time_min)).toBe(120);
  });

  it("charts none of another user's distance", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stats/distance?period=all')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(response.body.bikes).toEqual([]);
  });

  it("compares the year with last year up to the same day, the owner's rides only", async () => {
    // ARRANGE: 1 January last year always falls inside last year up to today; the ride three days ago never does.
    const lastNewYear = new Date(Date.UTC(new Date().getUTCFullYear() - 1, 0, 1, 12));
    const earlier = await prisma.rides.create({
      data: {
        user_id: ownerId,
        bike_id: bikeId,
        started_at: lastNewYear,
        distance_m: 25000,
        duration_min: 75,
        elevation_up_m: 600,
      },
    });

    const owned = await request(app.getHttpServer())
      .get('/api/stats/distance?period=year')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const foreign = await request(app.getHttpServer())
      .get('/api/stats/distance?period=year')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);
    const allTime = await request(app.getHttpServer())
      .get('/api/stats/distance?period=all')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    // Out again, so the other figures stay on the one ride.
    await prisma.rides.delete({ where: { id: earlier.id } });

    expect(owned.body.previous).toEqual(
      expect.objectContaining({
        from: isoDay(lastNewYear.getTime()),
        meters: 25000,
        elevation_m: 600,
        time_min: 75,
      }),
    );
    expect(sum(owned.body.previous.daily_m)).toBe(25000);
    expect(sum(owned.body.previous.daily_elevation_m)).toBe(600);
    expect(sum(owned.body.previous.daily_time_min)).toBe(75);
    expect(foreign.body.previous).toEqual(
      expect.objectContaining({ meters: 0, elevation_m: 0, time_min: 0 }),
    );
    expect(sum(foreign.body.previous.daily_m)).toBe(0);
    expect(allTime.body.previous).toBeNull();
  });

  describe('a custom Period', () => {
    let customRideIds: number[];

    const addRide = async (startedAt: string, meters: number): Promise<number> => {
      const { id } = await prisma.rides.create({
        data: { user_id: ownerId, bike_id: bikeId, started_at: new Date(startedAt), distance_m: meters },
      });
      return id;
    };

    const distanceOver = async (query: string, token = ownerToken): Promise<request.Response> =>
      request(app.getHttpServer())
        .get(`/api/stats/distance?${query}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    beforeAll(async () => {
      customRideIds = [
        await addRide('2023-06-15T12:00:00.000Z', 5000),
        await addRide('2024-02-10T12:00:00.000Z', 10000),
        await addRide('2024-03-08T12:00:00.000Z', 20000),
        await addRide('2024-03-10T12:00:00.000Z', 30000),
      ];
    });

    afterAll(async () => {
      await prisma.rides.deleteMany({ where: { id: { in: customRideIds } } });
    });

    it('spends between two days, in the shape a named Period has', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/stats/spend?from=2025-05-10&to=2025-05-10')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          from: '2025-05-10',
          to: '2025-05-10',
          total: 350,
          categories: [expect.objectContaining({ key: 'unassigned', amount: 350 })],
          bikes: [expect.objectContaining({ bike_id: bikeId, total: 350, service_count: 2 })],
        }),
      );
    });

    it('compares a whole month with the month before', async () => {
      const { body } = await distanceOver('from=2024-03-01&to=2024-03-31');

      expect(body).toEqual(expect.objectContaining({ from: '2024-03-01', to: '2024-03-31' }));
      expect(body.bikes).toEqual([expect.objectContaining({ bike_id: bikeId, total_km: 50, ride_count: 2 })]);
      expect(body.bikes[0].daily_m).toHaveLength(31);
      expect(body.previous).toEqual(expect.objectContaining({ from: '2024-02-01', meters: 10000 }));
      expect(body.previous.daily_m).toHaveLength(29);
    });

    it('compares a whole year with the year before', async () => {
      const { body } = await distanceOver('from=2024-01-01&to=2024-12-31');

      expect(body.bikes).toEqual([expect.objectContaining({ total_km: 60 })]);
      expect(body.previous).toEqual(expect.objectContaining({ from: '2023-01-01', meters: 5000 }));
      expect(body.previous.daily_m).toHaveLength(365);
    });

    it('compares any other days with the same number of days right before', async () => {
      const { body } = await distanceOver('from=2024-03-10&to=2024-03-12');

      expect(body.bikes).toEqual([expect.objectContaining({ daily_m: [30000, 0, 0] })]);
      expect(body.previous).toEqual(
        expect.objectContaining({ from: '2024-03-07', meters: 20000, daily_m: [0, 20000, 0] }),
      );
    });

    it("charts none of another user's days", async () => {
      const { body } = await distanceOver('from=2024-03-01&to=2024-03-31', strangerToken);

      expect(body.bikes).toEqual([]);
      expect(body.previous).toEqual(expect.objectContaining({ meters: 0 }));
    });

    it.each(['spend', 'distance'])('refuses a broken pair on %s', async (endpoint) => {
      const broken = [
        'from=2024-03-01',
        'to=2024-03-31',
        'from=2024-03-31&to=2024-03-01',
        'from=2024-02-30&to=2024-03-01',
        'from=2024-13-01&to=2024-13-02',
        'from=march&to=2024-03-01',
        'from=&to=2024-03-01',
        'period=month&from=2024-03-01&to=2024-03-31',
      ];

      for (const query of broken) {
        await request(app.getHttpServer())
          .get(`/api/stats/${endpoint}?${query}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(400);
      }
    });

    it('reports the earliest ride or dated Service as the first day of the garage', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/stats/earliest-day')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toEqual({ day: '2023-06-15' });
    });

    it('reports the Service when it came before every ride', async () => {
      // ARRANGE: the custom rides out, and a Service dated before anything else.
      await prisma.rides.deleteMany({ where: { id: { in: customRideIds } } });
      const { id } = await prisma.events_bikes.create({
        data: { bike_id: bikeId, service_date: new Date(2022, 1, 3), is_deleted: false },
      });

      const response = await request(app.getHttpServer())
        .get('/api/stats/earliest-day')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      await prisma.events_bikes.delete({ where: { id } });

      expect(response.body).toEqual({ day: '2022-02-03' });
    });

    it('reports no day for an empty garage', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/stats/earliest-day')
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(200);

      expect(response.body).toEqual({ day: null });
    });
  });

  it('forecasts the chain jobs soonest first, at the pace of the last four weeks', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stats/wear-forecast')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    // 40 km in four weeks is 10 a week: 120 km left on the check is 12 weeks, 320 on the replacement 32.
    expect(response.body.items).toEqual([
      expect.objectContaining({
        bike_id: bikeId,
        event_action_id: CHAIN_WEAR_CHECK,
        percentage: 80,
        pace_per_week: 10,
        projected_date: isoDay(Date.now() + 12 * 7 * DAY_MS),
      }),
      expect.objectContaining({
        event_action_id: CHAIN_REPLACEMENT,
        percentage: 60,
        pace_per_week: 10,
        projected_date: isoDay(Date.now() + 32 * 7 * DAY_MS),
      }),
    ]);
    expect(response.body.items[0].points.at(-1)).toEqual({ date: isoDay(Date.now()), percentage: 80 });
  });

  it("forecasts none of another user's parts", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stats/wear-forecast')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(response.body).toEqual({ items: [] });
  });
});

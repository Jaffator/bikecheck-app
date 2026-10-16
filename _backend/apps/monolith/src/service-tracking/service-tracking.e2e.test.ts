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

// A Tracked Action is only ever reached through its bike, so every endpoint here is also
// asked from the seat of a user who does not own that bike.
describe('ServiceTrackingController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bikeId: number;
  // The chain mounted on the owner's bike: 480 km driven, so 80 % of the check and 60 % of the replacement.
  let chainId: number;
  // Logged in once each: login is throttled to 5 a minute.
  let ownerToken: string | undefined;
  let strangerToken: string | undefined;

  const stamp = Date.now();
  const owner = {
    name: `tracking-owner-${stamp}`,
    email: `tracking-owner-${stamp}@bikecheck.test`,
    password: 'abcd1234',
  };
  const stranger = {
    name: `tracking-stranger-${stamp}`,
    email: `tracking-stranger-${stamp}@bikecheck.test`,
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
  const registerVerified = async (credentials: typeof owner): Promise<void> => {
    await request(app.getHttpServer()).post('/api/auth/register').send(credentials).expect(201);
    await prisma.users.update({ where: { email: credentials.email }, data: { email_verified_at: new Date() } });
  };

  // A day ahead: a plan cannot be for one that has passed.
  const nextWeek = new Date(Date.now() + 7 * DAY_MS).toISOString().slice(0, 10);

  // Always the replacement, so the Wear Check the attention test reads stays untouched.
  const writeReplacement = (
    setting: 'interval' | 'notify' | 'plan',
    token: string | undefined,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      .post(`/api/service-tracking/${setting}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ component_mounted_id: chainId, event_action_id: CHAIN_REPLACEMENT, ...body });

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

    // ARRANGE: the owner adds an Enduro with a chain, which copies the type's default intervals.
    await registerVerified(owner);
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

    // The Strava sync grows the accumulator; written here instead.
    const chain = await prisma.components_mounted.findFirstOrThrow({ where: { bike_id: bikeId } });
    chainId = chain.id;
    await prisma.components_mounted.update({ where: { id: chainId }, data: { drivetrain_km: 480 } });

    await registerVerified(stranger);
    strangerToken = await login(stranger);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reads every Tracked Action on the bike, worst first', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/service-tracking/tracked-actions?bikeId=${bikeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    // A chain wears by the kilometres it drove under load, not the bike's own.
    expect(response.body).toEqual([
      expect.objectContaining({
        component_mounted_id: chainId,
        event_action_id: CHAIN_WEAR_CHECK,
        measure: 'drivetrain_km',
        current: 480,
        interval: 600,
        percentage: 80,
        level: 'warning',
        notify: true,
        planned_for: null,
      }),
      expect.objectContaining({
        component_mounted_id: chainId,
        event_action_id: CHAIN_REPLACEMENT,
        current: 480,
        interval: 800,
        percentage: 60,
        level: 'good',
        replace_action: true,
      }),
    ]);
  });

  it("refuses to read the Tracked Actions on another user's bike", async () => {
    await request(app.getHttpServer())
      .get(`/api/service-tracking/tracked-actions?bikeId=${bikeId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);
  });

  it('lists across the garage only what has come as far as asked', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/service-tracking/attention?minPercentage=80')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        event_action_id: CHAIN_WEAR_CHECK,
        percentage: 80,
        bike_id: bikeId,
        bike_brand: 'Santa Cruz',
        bike_model: 'Hightower',
        year: 2022,
      }),
    ]);
  });

  it("lists nothing from another user's garage", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/service-tracking/attention?minPercentage=0')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("sets the owner's own interval, and clearing it puts the bike's plan back", async () => {
    const overridden = await writeReplacement('interval', ownerToken, { interval_override: 960 }).expect(201);
    expect(overridden.body).toEqual(
      expect.objectContaining({ interval: 960, percentage: 50, interval_override: 960, default_interval: 800 }),
    );

    const restored = await writeReplacement('interval', ownerToken, { interval_override: null }).expect(201);
    expect(restored.body).toEqual(expect.objectContaining({ interval: 800, percentage: 60, interval_override: null }));
  });

  it("refuses to set the interval on another user's part", async () => {
    await writeReplacement('interval', strangerToken, { interval_override: 2000 }).expect(404);
  });

  it('mutes a Tracked Action and unmutes it', async () => {
    const muted = await writeReplacement('notify', ownerToken, { notify: false }).expect(201);
    expect(muted.body.notify).toBe(false);

    const unmuted = await writeReplacement('notify', ownerToken, { notify: true }).expect(201);
    expect(unmuted.body.notify).toBe(true);
  });

  it("refuses to mute another user's Tracked Action", async () => {
    await writeReplacement('notify', strangerToken, { notify: false }).expect(404);
  });

  it('plans a Tracked Action for a day and removes the plan', async () => {
    const planned = await writeReplacement('plan', ownerToken, {
      planned_for: nextWeek,
      time_zone: 'Europe/Prague',
    }).expect(201);
    expect(planned.body.planned_for).toBe(nextWeek);

    const removed = await writeReplacement('plan', ownerToken, { planned_for: null }).expect(201);
    expect(removed.body.planned_for).toBeNull();
  });

  it("refuses to plan another user's Tracked Action", async () => {
    await writeReplacement('plan', strangerToken, { planned_for: nextWeek }).expect(404);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

const DAY_MS = 24 * 60 * 60 * 1000;
// Seeded catalogue (ADR 0019): a chain carries the drivetrain kilometres a moved ride takes along.
const CHAIN_TYPE_ID = 295;

// Rides come from Strava, so they are written straight into the table; each endpoint is
// then also asked from the seat of a user who owns neither the ride nor the bike.
describe('RideController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerId: number;
  // The owner's two bikes, so a ride has somewhere to move to, and the stranger's one.
  let bikeId: number;
  let otherBikeId: number;
  let strangerBikeId: number;
  // Logged in once each: login is throttled to 5 a minute.
  let ownerToken: string | undefined;
  let strangerToken: string | undefined;

  const stamp = Date.now();
  const owner = { name: `ride-owner-${stamp}`, email: `ride-owner-${stamp}@bikecheck.test`, password: 'abcd1234' };
  const stranger = {
    name: `ride-stranger-${stamp}`,
    email: `ride-stranger-${stamp}@bikecheck.test`,
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

  const createBike = async (token: string | undefined, brand: string, model: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/api/bike/create')
      .set('Authorization', `Bearer ${token}`)
      .field(
        'data',
        JSON.stringify({
          bike: {
            bike_brand: brand,
            bike_model: model,
            year: 2022,
            ebike: false,
            has_front_suspension: true,
            has_rear_suspension: true,
          },
          // Mounted before every ride below, so each of them is carried by it.
          components: [{ component_type_id: CHAIN_TYPE_ID, mounted_at: '2025-01-01T00:00:00.000Z' }],
        }),
      )
      .expect(201);
    return response.body.id;
  };

  // One of the owner's rides as the Strava sync saves it; the name lives in the stored payload.
  const insertRide = async (bike: number, ride: Partial<Prisma.ridesUncheckedCreateInput>): Promise<number> => {
    const row = await prisma.rides.create({
      data: {
        user_id: ownerId,
        bike_id: bike,
        distance_m: 25400,
        duration_min: 90,
        json_data: { name: 'Ride' },
        ...ride,
      },
    });
    return row.id;
  };

  const chainKm = async (bike: number): Promise<number | null | undefined> => {
    const chain = await prisma.components_mounted.findFirst({
      where: { bike_id: bike },
      select: { drivetrain_km: true },
    });
    return chain?.drivetrain_km;
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

    // ARRANGE: the owner has two bikes and two rides last spring; the stranger has one bike.
    ownerId = await registerVerified(owner);
    ownerToken = await login(owner);
    bikeId = await createBike(ownerToken, 'Santa Cruz', 'Hightower');
    otherBikeId = await createBike(ownerToken, 'Canyon', 'Spectral');

    await insertRide(bikeId, {
      started_at: new Date('2025-03-14T08:00:00.000Z'),
      distance_m: 25400,
      duration_min: 90,
      elevation_up_m: 800,
      json_data: { name: 'Evening loop' },
    });
    await insertRide(bikeId, {
      started_at: new Date('2025-04-02T08:00:00.000Z'),
      distance_m: 10000,
      duration_min: 40,
      elevation_up_m: 300,
      json_data: { name: 'Commute' },
    });

    await registerVerified(stranger);
    strangerToken = await login(stranger);
    strangerBikeId = await createBike(strangerToken, 'Trek', 'Slash');
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the rides of a period newest first, with their figures', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rides?from=2025-03-01&to=2025-04-30&tz=UTC')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.total).toBe(2);
    expect(response.body.items.map((ride: { name: string }) => ride.name)).toEqual(['Commute', 'Evening loop']);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        bike_id: bikeId,
        bike_name: 'Santa Cruz Hightower 2022',
        started_at: '2025-04-02T08:00:00.000Z',
        distance_m: 10000,
        check_in: null,
      }),
    );
    expect(response.body.figures).toEqual(
      expect.objectContaining({ count: 2, distance_m: 35400, time_min: 130, elevation_up_m: 1100 }),
    );
  });

  it("lists none of the rides on another user's bike", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/rides?bikeId=${bikeId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(response.body.total).toBe(0);
    expect(response.body.items).toEqual([]);
  });

  it('names the months ridden in, newest first', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rides/months?tz=UTC')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    // The spring rides are the oldest any test writes, so they close the list.
    expect(response.body.slice(-2)).toEqual(['2025-04', '2025-03']);
  });

  it("names no month from another user's rides", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rides/months')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("moves a ride and its drivetrain wear to the owner's other bike", async () => {
    // ARRANGE: 30 km under load, carried by the chain on the first bike.
    await prisma.components_mounted.updateMany({ where: { bike_id: bikeId }, data: { drivetrain_km: 30 } });
    const rideId = await insertRide(bikeId, {
      started_at: new Date('2025-06-01T08:00:00.000Z'),
      distance_m: 30000,
      drivetrain_meters: 30000,
    });

    // ACT
    await request(app.getHttpServer())
      .patch(`/api/rides/${rideId}/bike`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bikeId: otherBikeId })
      .expect(200)
      .expect({ success: true });

    // ASSERT
    const listed = await request(app.getHttpServer())
      .get(`/api/rides?bikeId=${otherBikeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(listed.body.items).toEqual([expect.objectContaining({ id: rideId, bike_name: 'Canyon Spectral 2022' })]);
    expect(await chainKm(bikeId)).toBe(0);
    expect(await chainKm(otherBikeId)).toBe(30);
  });

  it("refuses to move another user's ride", async () => {
    const rideId = await insertRide(bikeId, { started_at: new Date('2025-06-02T08:00:00.000Z') });

    await request(app.getHttpServer())
      .patch(`/api/rides/${rideId}/bike`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ bikeId: strangerBikeId })
      .expect(404);

    const ride = await prisma.rides.findUnique({ where: { id: rideId }, select: { bike_id: true } });
    expect(ride?.bike_id).toBe(bikeId);
  });

  it("refuses to move a ride onto another user's bike", async () => {
    const rideId = await insertRide(bikeId, { started_at: new Date('2025-06-03T08:00:00.000Z') });

    await request(app.getHttpServer())
      .patch(`/api/rides/${rideId}/bike`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bikeId: strangerBikeId })
      .expect(404);
  });

  it('dismisses a ride for good, so Strava does not bring it back', async () => {
    // Unique across a table every suite shares.
    const activityId = BigInt(Date.now());
    const rideId = await insertRide(bikeId, {
      started_at: new Date('2025-07-01T08:00:00.000Z'),
      activity_strava_id: activityId,
    });

    // ACT
    await request(app.getHttpServer())
      .post(`/api/rides/${rideId}/dismiss`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect({ success: true });

    // ASSERT: resolved with no ride is how the next sync knows to skip the activity.
    expect(await prisma.rides.findUnique({ where: { id: rideId } })).toBeNull();
    const parked = await prisma.strava_pending_activities.findUnique({ where: { activity_id: activityId } });
    expect(parked?.resolved_at).toBeInstanceOf(Date);
  });

  it("refuses to dismiss another user's ride", async () => {
    const rideId = await insertRide(bikeId, { started_at: new Date('2025-07-02T08:00:00.000Z') });

    await request(app.getHttpServer())
      .post(`/api/rides/${rideId}/dismiss`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);

    expect(await prisma.rides.findUnique({ where: { id: rideId } })).not.toBeNull();
  });

  it('offers a fresh ride in the check-in, with what it wore off on each bike', async () => {
    // ARRANGE: the drawer has never opened, and yesterday's ride has just synced.
    await prisma.users.update({ where: { id: ownerId }, data: { check_in_prompted_at: null } });
    const rideId = await insertRide(bikeId, { started_at: new Date(Date.now() - DAY_MS), created_at: new Date() });

    const response = await request(app.getHttpServer())
      .get('/api/rides/check-in-prompt')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.pending).toEqual([]);
    // Contained, not equal: any other unchecked recent ride of the owner is offered too.
    expect(response.body.rides).toContainEqual(
      expect.objectContaining({
        id: rideId,
        check_in: null,
        // No bike plans a service interval, so the ride wore nothing off on either.
        wore_off_by_bike: [
          { bike_id: bikeId, wore_off: [] },
          { bike_id: otherBikeId, wore_off: [] },
        ],
      }),
    );
  });

  it("offers none of another user's rides in the check-in", async () => {
    // ARRANGE: the owner has a fresh ride the stranger must not be offered.
    await prisma.users.update({ where: { id: ownerId }, data: { check_in_prompted_at: null } });
    await insertRide(bikeId, { started_at: new Date(Date.now() - DAY_MS), created_at: new Date() });

    const response = await request(app.getHttpServer())
      .get('/api/rides/check-in-prompt')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    expect(response.body).toEqual({ rides: [], pending: [] });
  });

  it('stops offering what the opened drawer showed, until another ride arrives', async () => {
    await insertRide(bikeId, { started_at: new Date(Date.now() - DAY_MS), created_at: new Date() });

    // ACT
    await request(app.getHttpServer())
      .post('/api/rides/check-in-prompt/seen')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect({ success: true });

    // ASSERT
    const quiet = await request(app.getHttpServer())
      .get('/api/rides/check-in-prompt')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(quiet.body).toEqual({ rides: [], pending: [] });

    // A second after the drawer, so the arrival is unambiguously later.
    const laterId = await insertRide(bikeId, {
      started_at: new Date(Date.now() - DAY_MS),
      created_at: new Date(Date.now() + 1000),
    });
    const again = await request(app.getHttpServer())
      .get('/api/rides/check-in-prompt')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(again.body.rides.map((ride: { id: number }) => ride.id)).toEqual([laterId]);
  });

  it("does not quiet another user's check-in", async () => {
    await prisma.users.update({ where: { id: ownerId }, data: { check_in_prompted_at: null } });

    await request(app.getHttpServer())
      .post('/api/rides/check-in-prompt/seen')
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(200);

    const user = await prisma.users.findUnique({ where: { id: ownerId }, select: { check_in_prompted_at: true } });
    expect(user?.check_in_prompted_at).toBeNull();
  });

  it('saves a check-in, keeping each symptom once and the note trimmed', async () => {
    const rideId = await insertRide(bikeId, { started_at: new Date('2025-08-01T08:00:00.000Z') });

    const response = await request(app.getHttpServer())
      .put(`/api/rides/${rideId}/check-in`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ISSUE', symptoms: ['CREAK', 'CREAK', 'SOFT_BRAKE'], note: '  Creaks on climbs  ' })
      .expect(200);

    expect(response.body).toEqual({ status: 'ISSUE', symptoms: ['CREAK', 'SOFT_BRAKE'], note: 'Creaks on climbs' });
  });

  it("refuses to check in another user's ride", async () => {
    const rideId = await insertRide(bikeId, { started_at: new Date('2025-08-02T08:00:00.000Z') });

    await request(app.getHttpServer())
      .put(`/api/rides/${rideId}/check-in`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ status: 'OK' })
      .expect(404);

    expect(await prisma.ride_check_ins.findUnique({ where: { ride_id: rideId } })).toBeNull();
  });

  it("removes a ride's check-in", async () => {
    const rideId = await insertRide(bikeId, { started_at: new Date('2025-08-03T08:00:00.000Z') });
    await prisma.ride_check_ins.create({ data: { ride_id: rideId, status: 'OK' } });

    await request(app.getHttpServer())
      .delete(`/api/rides/${rideId}/check-in`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect({ success: true });

    expect(await prisma.ride_check_ins.findUnique({ where: { ride_id: rideId } })).toBeNull();
  });

  it("refuses to remove the check-in of another user's ride", async () => {
    const rideId = await insertRide(bikeId, { started_at: new Date('2025-08-04T08:00:00.000Z') });
    await prisma.ride_check_ins.create({ data: { ride_id: rideId, status: 'OK' } });

    await request(app.getHttpServer())
      .delete(`/api/rides/${rideId}/check-in`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);

    expect(await prisma.ride_check_ins.findUnique({ where: { ride_id: rideId } })).not.toBeNull();
  });
});

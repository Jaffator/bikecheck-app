import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

// A service is only ever reachable through its bike, so every endpoint here is
// checked from the seat of a user who does not own that bike.
describe('BikeEventController (e2e)', () => {
  let app: INestApplication;
  // The owner's bike, and a service recorded on it.
  let bikeId: number;
  let bikeEventId: number;
  // The user who owns neither.
  let strangerToken: string | undefined;

  const owner = { name: 'owner', email: `owner-${Date.now()}@bikecheck.test`, password: 'abcd1234' };
  const stranger = { name: 'stranger', email: `stranger-${Date.now()}@bikecheck.test`, password: 'abcd1234' };

  const login = async (credentials: { email: string; password: string }): Promise<string | undefined> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    const cookies = setCookie.parse(response.header['set-cookie']);
    return cookies.find((cookie) => cookie.name === 'access_token')?.value;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    // ARRANGE: the owner registers, adds a bike and records one service on it.
    await request(app.getHttpServer()).post('/api/auth/register').send(owner).expect(201);
    const ownerToken = await login(owner);

    const bikeResponse = await request(app.getHttpServer())
      .post('/api/bike/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field(
        'data',
        JSON.stringify({
          bike: {
            bike_brand: 'Santa Cruz',
            bike_model: 'Hightower',
            bikename: 'Trail bike',
            ebike: false,
            has_front_suspension: true,
            has_rear_suspension: true,
          },
          components: [],
        }),
      )
      .expect(201);
    bikeId = bikeResponse.body.id;

    const eventResponse = await request(app.getHttpServer())
      .post('/api/bike-events/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bike_id: bikeId,
        total_cost: 350,
        note: 'Backfilled service',
        service_date: '2026-07-01T00:00:00.000Z',
        actions_done: [],
      })
      .expect(201);
    bikeEventId = eventResponse.body.id;

    // The stranger registers and gets nothing but their own account.
    await request(app.getHttpServer()).post('/api/auth/register').send(stranger).expect(201);
    strangerToken = await login(stranger);
  });

  afterAll(async () => {
    await app.close();
  });

  it('records the service date separately from the creation date', async () => {
    const ownerToken = await login(owner);

    const response = await request(app.getHttpServer())
      .get(`/api/bike-events/${bikeEventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.service_date).toBe('2026-07-01T00:00:00.000Z');
    expect(response.body.created_at).not.toBe(response.body.service_date);
  });

  it('names the bike on the detail, so the view need not fetch it separately', async () => {
    const ownerToken = await login(owner);

    const response = await request(app.getHttpServer())
      .get(`/api/bike-events/${bikeEventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.bike_name).toBe('Trail bike');
    // Nothing was done on this service, so no action froze the odometer.
    expect(response.body.bike_km_at_time).toBeNull();
  });

  it('records a service that cost nothing and carries no note', async () => {
    const ownerToken = await login(owner);

    // ACT: an evening in the garage - no receipt, no figure, nothing to write down.
    const response = await request(app.getHttpServer())
      .post('/api/bike-events/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bike_id: bikeId, total_cost: 0, actions_done: [] })
      .expect(201);

    expect(response.body.total_cost).toBe(0);
  });

  it('lists the history newest work first, with a total', async () => {
    const ownerToken = await login(owner);

    const response = await request(app.getHttpServer())
      .get('/api/bike-events/history?limit=3&offset=0')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({ bike_id: bikeId, bike_name: 'Trail bike', action_count: 0 }),
    );
  });

  it('offers no categories on a bike with no parts mounted', async () => {
    const ownerToken = await login(owner);

    const response = await request(app.getHttpServer())
      .get(`/api/bike-events/categories?bikeId=${bikeId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    // The bike was created without components, so every category is empty and none is offered.
    expect(response.body).toEqual([]);
  });

  it("refuses to list the categories on another user's bike", async () => {
    await request(app.getHttpServer())
      .get(`/api/bike-events/categories?bikeId=${bikeId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it("refuses to list the actions available on another user's bike", async () => {
    await request(app.getHttpServer())
      .get(`/api/bike-events/group-actions?groupId=1&bikeId=${bikeId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it('changes the note, the total and the service date of a saved service', async () => {
    const ownerToken = await login(owner);

    // ARRANGE: a service of its own, so the edits cannot disturb the other tests.
    const created = await request(app.getHttpServer())
      .post('/api/bike-events/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bike_id: bikeId,
        total_cost: 100,
        note: 'Typo',
        service_date: '2026-07-01T00:00:00.000Z',
        actions_done: [],
      })
      .expect(201);

    // ACT
    const response = await request(app.getHttpServer())
      .patch(`/api/bike-events/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ note: 'Bike Shop XY', total_cost: 2400, service_date: '2026-06-01T00:00:00.000Z' })
      .expect(200);

    // ASSERT
    expect(response.body).toEqual(
      expect.objectContaining({
        note: 'Bike Shop XY',
        total_cost: 2400,
        service_date: '2026-06-01T00:00:00.000Z',
      }),
    );
  });

  it('adds and removes an attachment on a saved service', async () => {
    const ownerToken = await login(owner);

    const created = await request(app.getHttpServer())
      .post('/api/bike-events/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bike_id: bikeId, total_cost: 100, note: 'With receipt', actions_done: [] })
      .expect(201);

    // ACT: the receipt turns up after the service was recorded.
    const added = await request(app.getHttpServer())
      .patch(`/api/bike-events/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        attachments_added: [
          { name: 'invoice.pdf', url: 'https://cdn.test/invoice.pdf', content_type: 'application/pdf' },
        ],
      })
      .expect(200);

    expect(added.body.attachments).toHaveLength(1);

    // ACT: and turns out to be the wrong one.
    const removed = await request(app.getHttpServer())
      .patch(`/api/bike-events/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ attachments_removed: [added.body.attachments[0].id] })
      .expect(200);

    // ASSERT
    expect(removed.body.attachments).toEqual([]);
  });

  it('refuses an action that belongs to another service', async () => {
    const ownerToken = await login(owner);

    await request(app.getHttpServer())
      .patch(`/api/bike-events/${bikeEventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ actions_removed: [999999] })
      .expect(400);
  });

  it("refuses to edit another user's service", async () => {
    await request(app.getHttpServer())
      .patch(`/api/bike-events/${bikeEventId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ note: 'Not mine' })
      .expect(403);
  });

  it("refuses to create a service on another user's bike", async () => {
    await request(app.getHttpServer())
      .post('/api/bike-events/create')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ bike_id: bikeId, total_cost: 10, note: 'Not mine', actions_done: [] })
      .expect(403);
  });

  it("refuses to list the services of another user's bike", async () => {
    await request(app.getHttpServer())
      .get(`/api/bike-events/find-all/${bikeId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it("refuses to read another user's service", async () => {
    await request(app.getHttpServer())
      .get(`/api/bike-events/${bikeEventId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it("refuses to page the history of another user's bike", async () => {
    await request(app.getHttpServer())
      .get(`/api/bike-events/history?bikeId=${bikeId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it("refuses to soft delete another user's service", async () => {
    await request(app.getHttpServer())
      .delete(`/api/bike-events/delsoft/${bikeEventId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it("refuses to hard delete another user's service", async () => {
    await request(app.getHttpServer())
      .delete(`/api/bike-events/delhard/${bikeEventId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });
});

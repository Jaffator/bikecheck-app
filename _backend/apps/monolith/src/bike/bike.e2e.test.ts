import { Test, TestingModule } from '@nestjs/testing';
import type { ResponseBikeDto } from './dto/response-bike.dto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

describe('BikeController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | undefined;
  const rider = { name: 'test', email: `getbiketest-${Date.now()}@bikecheck.test`, password: 'abcd1234' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Login is closed until the address is verified (ADR 0031); auth.e2e covers the link itself.
    await request(app.getHttpServer()).post('/api/auth/register').send(rider).expect(201);
    await app.get(PrismaService).users.update({ where: { email: rider.email }, data: { email_verified_at: new Date() } });
    const resLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: rider.email, password: rider.password })
      .expect(200);
    accessToken = setCookie.parse(resLogin.header['set-cookie']).find((item) => item.name === 'access_token')?.value;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists no bikes for a new rider', async () => {
    const resBike = await request(app.getHttpServer())
      .get('/api/bike')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const bikes: ResponseBikeDto[] = resBike.body;
    expect(bikes).toEqual([]);
  });

  // The catalogue comes from the seed migration, so an empty database still offers parts.
  it('GET /components/default-components - ebike=false', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/components/default-components?ebike=false')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /components/default-components - ebike=true', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/components/default-components?ebike=true')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import type { ResponseBikeDto } from './dto/response-bike.dto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import request from 'supertest';
import setCookie from 'set-cookie-parser';

describe('BikeController (e2e)', () => {
  let app: INestApplication;
  let access_token: string | undefined;
  let refresh_token: string | undefined;
  const testexample = 'example@example.com';

  beforeEach(async () => {
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
  });
  afterAll(async () => {
    await app.close();
  });

  it('get bike', async () => {
    // ARRANGE
    // first login test user and get access token
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'test', email: 'getbiketest@getbiketest.com', password: 'abcd1234' })
      .expect(201);

    const resLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'getbiketest@getbiketest.com', password: 'abcd1234' })
      .expect(200);

    const setCookieArray = setCookie.parse(resLogin.header['set-cookie']);
    refresh_token = setCookieArray.find((item) => item.name === 'refresh_token')?.value;
    access_token = setCookieArray.find((item) => item.name === 'access_token')?.value;

    // ACT
    const resBike = await request(app.getHttpServer())
      .get('/api/bike/all')
      .set('Authorization', `Bearer ${access_token}`)
      .set('Cookie', [`refresh_token=${refresh_token}`])
      .expect(200);

    const bikes: ResponseBikeDto[] = resBike.body;
    // ASSERT
    expect(bikes).toBeDefined();
  });

  it('GET /default-components - ebike=false', async () => {
    const response = await request(app.getHttpServer()).get('/api/bike/default-components?ebike=false').expect(200);

    console.log('Components count:', response.body.length);
    console.log('Components:', JSON.stringify(response.body, null, 2));

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /default-components - ebike=true', async () => {
    const response = await request(app.getHttpServer()).get('/api/bike/default-components?ebike=true').expect(200);

    console.log('All components count:', response.body.length);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

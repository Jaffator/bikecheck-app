/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserResponseDto } from '../src/user/dto/user.dtos';
import setCookie from 'set-cookie-parser';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const testexample = 'example@example.com';
  let access_token: string | undefined;
  let refresh_token: string | undefined;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should ok /auth/test (GET)', () => {
    return request(app.getHttpServer()).get('/api/auth/test').expect(200).expect({ message: 'Refresh token done' });
  });

  it('should ok /auth/register (POST)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Jarda', email: testexample, password: 'abcd1234' })
      .expect(201);

    // ASSERT
    const user: UserResponseDto = res.body;
    expect(user.name).toBe('Jarda');
    expect(user.email).toBe(testexample);
    expect(user.id).toBe(1);
  });

  it('should nok /auth/register same user (POST)', async () => {
    // ACT
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Jarda', email: testexample, password: 'abcd1234' })
      .expect(409);
  });

  it('should ok /auth/login (POST)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testexample, password: 'abcd1234' })
      .expect(200);

    const setCookieArray = setCookie.parse(res.header['set-cookie']);
    refresh_token = setCookieArray.find((item) => item.name === 'refresh_token')?.value;
    access_token = setCookieArray.find((item) => item.name === 'access_token')?.value;

    // ASSERT
    const user: UserResponseDto = res.body;
    expect(user.name).toBe('Jarda');
    expect(user.email).toBe(testexample);
    expect(user.id).toBe(1);
  });

  it('should ok /users/:id (GET)', async () => {
    // ACT
    const res = await request(app.getHttpServer())
      .get('/api/users/1')
      .set('Authorization', `Bearer ${access_token}`)
      .set('Cookie', [`refresh_token=${refresh_token}`])
      .expect(200);
    // ASSERT
    const user: UserResponseDto = res.body;
    expect(user.name).toBe('Jarda');
    expect(user.email).toBe(testexample);
    expect(user.id).toBe(1);
  });
});
